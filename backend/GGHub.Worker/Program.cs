using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Services;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Serilog;

// GGHub katalog botu.
//
// Neden ayri bir konsol projesi (WebAPI'yi tekrar calistirmak yerine):
//  1. Kestrel yok, yani port 7263 catismasi yok: IDE'den gelistirirken bot calismaya devam eder.
//  2. HTTP yuzeyi yok.
//  3. En onemlisi: Railway backend/Dockerfile ile GGHub.WebAPI'yi derliyor. Job'lar bu projede
//     oldugu icin Railway onlari CALISTIRAMAZ. Faturayi yukselten sey job'in kendisi degil,
//     prod container'inda 7/24 calismasiydi; bu ayrim o hata sinifini yapisal olarak kaldiriyor.
//
// Yalnizca gelistirici makinesinde calisir ve prod Railway Postgres'ine yazar (kasitli kurulum).

var builder = Host.CreateApplicationBuilder(args);

// Ayarlar ve gizli anahtarlar app dizininin DISINDA duruyor (~/.gghub-bot/appsettings.json).
// Sebep: "gghub-bot update" her seferinde app/ dizinine yeniden publish ediyor; config orada
// olsaydi her guncellemede silinirdi. Ayrica bu dosya repoya hic girmiyor.
var botHome = Environment.GetEnvironmentVariable("GGHUB_BOT_HOME")
    ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".gghub-bot");

builder.Configuration.AddJsonFile(Path.Combine(botHome, "appsettings.json"), optional: true, reloadOnChange: false);

builder.Services.AddSerilog((services, configuration) => configuration
    .ReadFrom.Configuration(builder.Configuration)
    .ReadFrom.Services(services));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection eksik. ~/.gghub-bot/appsettings.json dosyasini kontrol et.");

builder.Services.AddDbContext<GGHubDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.CommandTimeout(30);
        npgsql.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorCodesToAdd: null);
    });
});

builder.Services.AddHttpClient();

// Metacritic: cookie'siz named client (WebAPI'deki kayitla ayni).
builder.Services.AddHttpClient("Metacritic")
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { UseCookies = false });
builder.Services.AddScoped<IMetacriticService, MetacriticService>();

builder.Services.Configure<GeminiSettings>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddScoped<IGeminiBudgetService, GeminiBudgetService>();
builder.Services.AddHttpClient<IGeminiService, GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromMinutes(3);
});

builder.Services.Configure<RawgApiSettings>(builder.Configuration.GetSection("RawgApiSettings"));
builder.Services.Configure<RawgImportSettings>(builder.Configuration.GetSection("Jobs:RawgImport"));
builder.Services.Configure<GameDetailBackfillSettings>(builder.Configuration.GetSection("Jobs:GameDetailBackfill"));
builder.Services.Configure<DescriptionTranslationSettings>(builder.Configuration.GetSection("Jobs:DescriptionTranslation"));

// Kosulsuz kaydediyoruz; "acik mi kapali mi" sorusunun tek cevap yeri appsettings.json olsun.
// Bunun calismasi icin her job'in Enabled bayragini KENDI ICINDE kontrol etmesi sart. Bayraklar
// eskiden burada (WebAPI Program.cs) kontrol ediliyordu; kayit yeri degisince kontrol tamamen
// kayboluyor ve job kapali sanilirken calisiyordu. Yeni job eklerken ExecuteAsync'in basina
// Enabled guard'ini koymayi unutma.
builder.Services.AddHostedService<MetacriticSyncJob>();
builder.Services.AddHostedService<GameDetailBackfillJob>();
builder.Services.AddHostedService<DescriptionTranslationJob>();
builder.Services.AddHostedService<FutureMetacriticCleanupJob>();

// RawgImportJob (genisleme/breadth) BILEREK kayitli degil. 4 stratejide de ~950. sayfada duruyor;
// oradaki oyunlari RAWG'de 13 kisi eklemis, kendi MinAdded=20 esigimizin altinda. Sayfa 5000'de
// bu sayi 0. Kalan ~750 bin oyun aramayi kirletir ve oneri algoritmasini guclendirmez.
// Checkpoint'ler RawgImportCheckpoints tablosunda duruyor; gerekirse buraya geri eklenebilir.

var host = builder.Build();

var logger = host.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("=== GGHub Worker basladi ===");

await host.RunAsync();
