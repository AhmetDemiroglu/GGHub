using Amazon.S3;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Logging;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Persistence.Seeders;
using GGHub.Infrastructure.Services;
using GGHub.Infrastructure.Settings;
using GGHub.WebAPI.Filters;
using GGHub.WebAPI.Hubs;
using GGHub.WebAPI.Logging;
using GGHub.WebAPI.Middleware;
using GGHub.WebAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Resend;
using Serilog;
using System.Text;
using System.IO.Compression;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using System.Globalization;
using System.Security.Claims;


var builder = WebApplication.CreateBuilder(args);
// Hata kaydi (admin paneli /errors). Kuyruk + sink Serilog'dan ONCE kayitli olmali: sink,
// logger kurulurken servis saglayicidan cozulur. ErrorLog:Enabled yazili degilse yalnizca
// Production'da acilir (localdeki backend canli DB'ye bagli; gelistirme hatalari canli
// tabloya yazilmasin).
builder.Services.Configure<ErrorLogOptions>(builder.Configuration.GetSection("ErrorLog"));
builder.Services.PostConfigure<ErrorLogOptions>(options => options.Enabled ??= builder.Environment.IsProduction());
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<ErrorLogQueue>();
builder.Services.AddSingleton<ErrorLogSink>();
builder.Host.UseSerilog((context, services, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration)
        .WriteTo.Sink(services.GetRequiredService<ErrorLogSink>())
);

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          var allowedOrigins = builder.Configuration
                            .GetSection("CorsOrigins")
                            .Get<string[]>() ?? new[] { "http://localhost:3000" };

                          if (builder.Environment.IsProduction())
                          {
                              var vercelUrl = "https://gg-hub-kappa.vercel.app";
                              var gghubUrl = "https://gghub.social";
                              var wwwGghubUrl = "https://www.gghub.social";

                              if (!allowedOrigins.Contains(vercelUrl))
                              {
                                  allowedOrigins = allowedOrigins.Append(vercelUrl).ToArray();
                              }
                              if (!allowedOrigins.Contains(gghubUrl))
                              {
                                  allowedOrigins = allowedOrigins.Append(gghubUrl).ToArray();
                              }
                              if (!allowedOrigins.Contains(wwwGghubUrl))
                              {
                                  allowedOrigins = allowedOrigins.Append(wwwGghubUrl).ToArray();
                              }
                          }

                          policy.WithOrigins(allowedOrigins)
                                                          .AllowAnyHeader()
                                .AllowAnyMethod()
                                .AllowCredentials();
                      });
});
builder.Services.Configure<RawgApiSettings>(builder.Configuration.GetSection("RawgApiSettings"));
builder.Services.AddHttpClient();

// RAWG icin adlandirilmis client. Varsayilan HttpClient.Timeout 100 sn'dir; RAWG'in coktugu
// gunlerde (orn. Cloudflare 522) her oyun detay istegi bu sureyi bekliyor, istemciler ise
// 15 sn'de vazgectigi icin DB fallback'ine hic ulasilamiyordu. Kisa deneme suresi + tek
// retry + circuit breaker: RAWG oluyken istekler milisaniyeler icinde duser ve DB kopyasi
// aninda servis edilir. Toplam but 10 sn: 15 sn'lik istemci timeout'unun icinde DB
// fallback'ine ~5 sn pay birakir.
builder.Services.AddHttpClient("Rawg")
    .AddStandardResilienceHandler(options =>
    {
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(4);
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(10);
        options.Retry.MaxRetryAttempts = 1;
        options.CircuitBreaker.FailureRatio = 0.5;
        options.CircuitBreaker.MinimumThroughput = 4;
        options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(60);
    });

// Steam magaza uclari (anahtarsiz): arama tamamlamada on-demand ingest icin.
// Ayni kisa-timeout mantigi: Steam yavas/erisilemezse arama DB-only davranisa doner.
builder.Services.Configure<SteamCatalogSettings>(builder.Configuration.GetSection("SteamCatalog"));
builder.Services.AddHttpClient("Steam")
    .AddStandardResilienceHandler(options =>
    {
        options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
        options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(12);
        options.Retry.MaxRetryAttempts = 1;
    });
builder.Services.AddScoped<ISteamCatalogService, SteamCatalogService>();

// IGDB: WebAPI'de yalnizca DI tamligi icin kayitli (job'lar Worker'da kosar).
builder.Services.Configure<IgdbSettings>(builder.Configuration.GetSection("Igdb"));
builder.Services.AddHttpClient("Igdb", client => client.Timeout = TimeSpan.FromSeconds(30));
builder.Services.AddScoped<IIgdbCatalogService, IgdbCatalogService>();

builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();

    var s3Config = new Amazon.S3.AmazonS3Config
    {
        ServiceURL = $"https://{config["R2:AccountId"]}.r2.cloudflarestorage.com",
        ForcePathStyle = true,
        AuthenticationRegion = "auto",
    };

    return new Amazon.S3.AmazonS3Client(
        config["R2:AccessKeyId"],
        config["R2:SecretAccessKey"],
        s3Config
    );
});

builder.Services.AddOptions<ResendClientOptions>().Configure(options =>
{
    options.ApiToken = builder.Configuration["ResendSettings:ApiKey"];
});
builder.Services.AddHttpClient<IResend, ResendClient>();

builder.Services.AddScoped<IGameService, RawgGameService>();
builder.Services.AddScoped<ISimilarGamesService, SimilarGamesService>();
builder.Services.AddScoped<IDiscoverService, DiscoverService>();
builder.Services.AddScoped<IAgendaService, AgendaService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserDtoEnricher, UserDtoEnricher>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IUserListService, UserListService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IDownloadAnalyticsService, DownloadAnalyticsService>();
builder.Services.AddScoped<ISiteAnalyticsService, SiteAnalyticsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<INotificationPreferenceService, NotificationPreferenceService>();
builder.Services.AddScoped<IMentionService, MentionService>();
builder.Services.AddHttpClient<IPushNotificationService, ExpoPushNotificationService>();
builder.Services.AddScoped<ISocialService, SocialService>();
builder.Services.AddScoped<IUserSuggestionService, UserSuggestionService>();
builder.Services.AddScoped<IEmailService, ResendEmailService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IPhotoService, PhotoService>();
builder.Services.AddScoped<IUserListRatingService, UserListRatingService>();
builder.Services.AddScoped<IUserListCommentService, UserListCommentService>();
builder.Services.AddScoped<IReviewCommentService, ReviewCommentService>();
// Somut tip de kayitli: ActivityService gonderi kartlarini cizmek icin
// PostService.MapAsync / WithIncludes'i kullaniyor ve bunlar Post entity'siyle
// calistigi icin IPostService'e konamaz (Core entity'leri Application arayuzune
// sizmasin). Arayuz AYNI ornekten cozuluyor, istek basina tek nesne.
// Demo seeder yalnizca DemoSeedController'dan cagriliyor; acilista
// CALISTIRILMAZ (gelistirme baglantisi canli veritabanina gidiyor).
builder.Services.AddScoped<DemoContentSeeder>();
builder.Services.AddScoped<PostService>();
builder.Services.AddScoped<IPostService>(sp => sp.GetRequiredService<PostService>());
builder.Services.AddSingleton<IEmailQueue, EmailQueue>();
builder.Services.AddHostedService<BackgroundEmailService>();
// Ikinci mesru istisna (bkz. asagidaki katalog job'lari notu): DownloadPageEvents
// tablosunun saklama budamasi PROD'da calismak zorunda, Worker ise yalnizca
// gelistirici makinesinde acilir. Gunde bir kez partili DELETE, CPU acisindan
// crawler job'lariyla kiyaslanamaz.
builder.Services.AddHostedService<DownloadEventRetentionJob>();
// Ucuncu mesru istisna: dogum gunu kutlamasi KULLANICIYA mail ve bildirim gonderir,
// tipki BackgroundEmailService gibi prod'da calismak ZORUNDA. Worker yalnizca
// gelistirici makinesinde acilir, orada dursa hicbir kullanici kutlama almazdi.
// Maliyet gunde birkac kez tek bir dar seq scan; Enabled bayragi job'in icinde
// kontrol ediliyor ve varsayilani false.
builder.Services.AddHostedService<BirthdayGreetingJob>();
// Besinci mesru istisna: hata kaydi yazicisi. Prod'daki hatalari yazmak icin prod'da calismak
// ZORUNDA. Hata olmadikca bos bekler (kuyruk), CPU maliyeti yok.
builder.Services.AddScoped<IErrorLogService, ErrorLogService>();
builder.Services.AddHostedService<ErrorLogWriter>();
// Dorduncu mesru istisna: AI bot motoru. Kullaniciya DM atan, gonderisine yanit veren bir is
// prod'da calismak ZORUNDA (SignalR ve push yalnizca WebAPI'den gider). Iki kapi: host kapisi
// AiAgents:HostEnabled (varsayilan false, yalnizca Railway env'de true; localdeki backend canli
// DB'ye bagli oldugu icin sart) + admin panelindeki AiSettings.AgentsEnabled. Maliyet: 30 sn'de
// bir kucuk bir kuyruk sorgusu; LLM cagrilari dakikada ~12 ile sinirli.
builder.Services.Configure<AiAgentHostSettings>(builder.Configuration.GetSection("AiAgents"));
builder.Services.AddSingleton<GeminiRateLimiter>();
builder.Services.AddScoped<AiLlmGateway>();
builder.Services.AddScoped<AiContentWriter>();
builder.Services.AddScoped<AiAgentTaskProcessor>();
builder.Services.AddScoped<AiConversationService>();
builder.Services.AddScoped<AiClubService>();
builder.Services.AddScoped<AiAgentPlanner>();
builder.Services.AddScoped<AiAdminService>();
builder.Services.AddHostedService<AiAgentEngine>();
builder.Services.Configure<GeminiSettings>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddScoped<IAiSettingsProvider, AiSettingsProvider>();
builder.Services.AddScoped<IAppReleaseService, AppReleaseService>();
builder.Services.AddScoped<IAiAgentDirectory, AiAgentDirectory>();
builder.Services.AddScoped<IAiInteractionPolicy, AiInteractionPolicy>();
builder.Services.AddScoped<IAiAgentEvents, AiAgentEvents>();
builder.Services.AddScoped<IGeminiBudgetService, GeminiBudgetService>();
builder.Services.AddHttpClient<IGeminiService, GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(3);
});
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IGamificationService, GamificationService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IHomeService, HomeService>();
builder.Services.AddScoped<ISitemapService, SitemapService>();
builder.Services.AddHttpClient("Metacritic")
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        UseCookies = false
    });
builder.Services.AddScoped<IMetacriticService, MetacriticService>();

// Katalog job'lari (Metacritic sync, RAWG import/backfill, ceviri) BILEREK burada kayitli degil.
// Hepsi GGHub.Worker konsol projesinde calisir ve yalnizca gelistirici makinesinde acilir.
// Railway bu Dockerfile ile GGHub.WebAPI'yi derledigi icin job'lari calistiramaz; boylece
// surekli calisan bir crawler'in prod container'inda CPU yakmasi yapisal olarak imkansiz.
// Buraya yeni bir AddHostedService eklemeden once bunu oku: GGHub.Worker'a ekle.
// Tek istisna BackgroundEmailService: kullaniciya mail gonderiyor, prod'da calismasi sart.

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

//if (builder.Environment.IsProduction())
//{
//    builder.Services.AddDbContext<GGHubDbContext>(options =>
//        options.UseNpgsql(connectionString));
//}
//else
//{
//    builder.Services.AddDbContext<GGHubDbContext>(options =>
//        options.UseSqlite(connectionString));
//}

builder.Services.AddDbContext<GGHubDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(30);
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration.GetSection("JwtSettings:Key").Value!)),
            ValidateIssuer = false,
            ValidateAudience = false
        };

        // Allow SignalR to receive the JWT token via query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
options.AddPolicy("Admin", policy => policy.RequireRole("Admin"));
});

// Railway TLS'i kendi proxy'sinde sonlandirip container'a duz HTTP ile gelir; gercek istemci
// IP'si ve semasi X-Forwarded-* basliklarinda tasinir. Bu ayar olmadan RemoteIpAddress herkes
// icin proxy'nin IP'siydi (IP bazli rate limit tek kovaya cokuyordu, asagidaki notlar). Known*
// listeleri bilerek bos: Railway'de container'a proxy disinda erisim yok, ForwardedForHeaderLimit
// varsayilani (1) ise yalnizca proxy'nin EKLEDIGI en sagdaki degeri okur, istemcinin kendi
// yazdigi sahte X-Forwarded-For degerleri dikkate alinmaz.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

static string ClientIpPartition(HttpContext httpContext) =>
    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

builder.Services.AddRateLimiter(options =>
{
    // Kimlik uclari (login/register/sifre): IP basina 30/dk.
    // ONCEKI HALI HATALIYDI: AddFixedWindowLimiter GLOBAL tek kovadir; tum kullanicilarin
    // login + register + refresh istekleri ayni 30'u paylasiyordu. Trafik artinca /auth/refresh
    // 429 aliyor, web istemcisi bunu oturum reddi sanip kullaniciyi cikisa atiyordu
    // (mobil 429'u gecici hata saydigi icin orada gorunmuyordu). IP artik guvenilir cunku
    // UseForwardedHeaders Railway'in X-Forwarded-For'unu isliyor.
    options.AddPolicy("LoginPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ClientIpPartition(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Token yenileme ayri kova: 64 baytlik rastgele token kaba kuvvetle bulunamaz, limit
    // yalnizca kotuye kullanim freni. Paylasimli NAT (ofis, okul) arkasindaki onlarca
    // oturum ayni IP'den yenilenir; 120/dk onlara bol pay birakir.
    options.AddPolicy("RefreshPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ClientIpPartition(httpContext),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Ceviri ucu Gemini'ye para harcatan tek public yol. Aylik butce tavani zarari sinirliyor,
    // ama tavani yakan biri mesru cevirileri de durdurur; o yuzden kullanici basina sert limit.
    // Partition anahtari kullanici kimligi: uc zaten [Authorize], kimlik her zaman var ve
    // kullanici basina tavan IP'den daha adil (ayni NAT arkasindaki iki kisi birbirini yakmaz).
    options.AddPolicy("TranslatePolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));

    // /download-app telemetri girisi anonim; kotuye kullanimi sinirlamak gerek.
    // Partition anahtari proxy'nin ilettigi ziyaretci hash'i (IP + UA + gun), IP DEGIL:
    // istek Next.js proxy'sinden gelir, yani buradaki RemoteIpAddress Vercel'in IP'sidir;
    // gercek ziyaretciyi yalniz proxy gorur ve hash olarak iletir. Gercek bir ziyaret en
    // fazla 3 olay gonderir; 60 limiti paylasimli NAT'a bol pay birakir.
    // Site geneli telemetri: bir gezinti sayfa basina 2 olay (goruntuleme + ayrilma) + etkilesimler
    // uretir; 5 dakikada 240, hizli gezen gercek bir kullaniciya bol pay birakir.
    options.AddPolicy("SiteTrackPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Request.Headers["X-Visitor-Hash"].ToString() is { Length: > 0 } siteVisitorHash
                ? siteVisitorHash
                : "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 240,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    options.AddPolicy("DownloadTrackPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Request.Headers["X-Visitor-Hash"].ToString() is { Length: > 0 } visitorHash
                ? visitorHash
                : "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    // Gonderi olusturma spam'e en acik yazma ucu: akisin en ustune dusuyor ve
    // her kayit bildirim + push zinciri tetikleyebiliyor. Partition anahtari
    // yine kullanici kimligi (IP neden kullanilamaz: yukaridaki not).
    // 20/5dk normal kullanimin cok uzerinde, kotuye kullanimin cok altinda.
    options.AddPolicy("PostCreatePolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserConnectionService, UserConnectionService>();
builder.Services.AddScoped<IHubNotificationService, HubNotificationService>();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "application/javascript",
        "text/css",
        "text/plain"
    });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});
// Fastest, SmallestSize DEGIL: sikistirma her yanit icin CPU harcar ve Railway container'inin
// paylasimli cekirdeginde SmallestSize bir JSON yanitini 5-10 kat daha uzun sikistirir; kazanc
// birkac yuzde bayt. Tarayicilar zaten Brotli'yi tercih eder; gzip'i sunucu tarafi fetch
// (Vercel SSR) ve eski istemciler kullanir, orada da gecikme boyuttan daha kritik.
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.AddMemoryCache();

builder.Services.AddControllers(options =>
{
    // ExternalCatalogUnavailableException -> 503 + code=catalog_unavailable (tum controller'lar).
    options.Filters.Add<ExternalCatalogUnavailableExceptionFilter>();
    // AiConsentRequiredException -> 403 + code=ai_consent_required (bota yazma denemeleri).
    options.Filters.Add<AiConsentRequiredExceptionFilter>();
});
builder.Services.AddLocalization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter the token after the word 'Bearer ' followed by a space.",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

var supportedCultures = new[]
{
    new CultureInfo("en-US"),
    new CultureInfo("tr"),
};

var localizationOptions = new RequestLocalizationOptions
{
    DefaultRequestCulture = new RequestCulture("en-US"),
    SupportedCultures = supportedCultures,
    SupportedUICultures = supportedCultures,
};
localizationOptions.RequestCultureProviders = new List<IRequestCultureProvider>
{
    new AcceptLanguageHeaderRequestCultureProvider(),
};

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<GGHubDbContext>();
        await GamificationSeeder.SeedAsync(context);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Seeding error: {ex.Message}");
    }
}

if (app.Environment.IsProduction())
{
    app.Logger.LogInformation("Production environment detected. Applying database migrations...");
    try
    {
        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();

            dbContext.Database.Migrate();
        }
        app.Logger.LogInformation("Database migration completed successfully.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred during database migration.");
    }
}

// DIKKAT - SIRALAMA: bu seeder BILEREK migration'dan SONRA calisir; GamificationSeeder'in
// yanina (yukariya) konulamaz. Cunku "UsernameNormalized" kolonunu ilk yaratan sey
// migration'in kendisi. Yukarida calissaydi ilk production deploy'unda kolon henuz
// yokken sorgu atar, patlar, hata yutulur ve uygulama TUM UsernameNormalized degerleri
// null halde hizmet vermeye baslardi: kullanici adiyla giris ve profil aramalari bozulurdu.
//
// DIKKAT - ORTAM: migration ile AYNI kosula bagli, bu bilincli.
// 1) Bu seeder kullanici adlarini YENIDEN ADLANDIRIYOR (geri donusu olmayan, kullaniciya
//    gorunen bir islem). Gelistirme baglantisi CANLI Railway Postgres'i gosteriyor
//    (bkz. appsettings.Development.json, bilincli bir tercih), yani bu kosul olmasaydi
//    yerelde "dotnet run" demek canli hesaplari gelistirici makinesinden yeniden
//    adlandirmak anlamina gelirdi.
// 2) Development'ta Migrate() calismadigi icin kolon henuz yokken sorgu atilirdi.
if (app.Environment.IsProduction())
{
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        var context = services.GetRequiredService<GGHubDbContext>();
        var seederLogger = services.GetRequiredService<ILogger<Program>>();
        var auditService = services.GetRequiredService<IAuditService>();

        await UsernameNormalizationSeeder.SeedAsync(context, seederLogger, auditService);
    }
}

// Ilk middleware olmali: sonraki her sey (rate limit, log, HSTS) gercek istemci IP'sini gormeli.
app.UseForwardedHeaders();

app.UseSerilogRequestLogging();

// Istek logunun ICINDE, diger her seyin DISINDA: yakalanmamis exception burada kayda girer
// ve 500 govdesi buradan doner. CORS basliklari yanit baslarken eklendigi icin bu yanit da tasir.
app.UseMiddleware<ErrorCaptureMiddleware>();

if (app.Environment.IsProduction())
{
    app.UseHsts();

    app.Use(async (context, next) =>
    {
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        await next();
    });
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "GGHub API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseResponseCompression();

app.UseCors(MyAllowSpecificOrigins);
app.UseRequestLocalization(localizationOptions);

if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseRateLimiter();

app.UseAuthentication();    

app.UseStaticFiles();    

app.UseAuthorization();

app.MapControllers();

app.MapHub<ChatHub>("/hubs/chat");

app.MapGet("/", () => "GGHub API is running!").AllowAnonymous();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow })).AllowAnonymous();

app.Run();
