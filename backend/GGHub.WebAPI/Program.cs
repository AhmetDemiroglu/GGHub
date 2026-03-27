using Amazon.S3;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Persistence.Seeders;
using GGHub.Infrastructure.Services;
using GGHub.Infrastructure.Settings;
using GGHub.WebAPI.Hubs;
using GGHub.WebAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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


var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration)
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
builder.Services.AddScoped<IDiscoverService, DiscoverService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IUserListService, UserListService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ISocialService, SocialService>();
builder.Services.AddScoped<IEmailService, ResendEmailService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IPhotoService, PhotoService>();
builder.Services.AddScoped<IUserListRatingService, UserListRatingService>();
builder.Services.AddScoped<IUserListCommentService, UserListCommentService>();
builder.Services.AddSingleton<IEmailQueue, EmailQueue>();
builder.Services.AddHostedService<BackgroundEmailService>();
builder.Services.AddHttpClient<IGeminiService, GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(3);
});
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IGamificationService, GamificationService>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IHomeService, HomeService>();
builder.Services.AddHttpClient("Metacritic")
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        UseCookies = false
    });
builder.Services.AddScoped<IMetacriticService, MetacriticService>();

var metacriticJobEnabled = builder.Configuration.GetValue<bool>("Jobs:MetacriticSync:Enabled");
if (metacriticJobEnabled)
{
    builder.Services.AddHostedService<MetacriticSyncJob>();
}

// RAWG Import Job - ONLY runs in Development environment (double safety check in job itself)
builder.Services.Configure<RawgImportSettings>(builder.Configuration.GetSection("Jobs:RawgImport"));
var rawgImportEnabled = builder.Configuration.GetValue<bool>("Jobs:RawgImport:Enabled");
if (rawgImportEnabled && builder.Environment.IsDevelopment())
{
    builder.Services.AddHostedService<RawgImportJob>();
}

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

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter(policyName: "LoginPolicy", opt =>
    {
        opt.PermitLimit = 30;             
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
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
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.SmallestSize;
});

builder.Services.AddMemoryCache();

builder.Services.AddControllers();
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

app.UseSerilogRequestLogging();

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
