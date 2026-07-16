using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace GGHub.Worker;

/// <summary>
/// "gghub-bot status" icin ilerleme ve harcama ozeti. Salt okunur.
/// </summary>
public static class WorkerStatus
{
    public static async Task PrintAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GGHubDbContext>();
        var budget = scope.ServiceProvider.GetRequiredService<IGeminiBudgetService>();
        var gemini = scope.ServiceProvider.GetRequiredService<IOptions<GeminiSettings>>().Value;

        // Tek tarama: her sayac icin ayri sorgu atmak Games'i defalarca taratirdi
        // (MetacriticSyncJob'da tam olarak bu hata vardi ve gunde ~161 GB okuyordu).
        // ToListAsync + client-side First: FirstOrDefaultAsync burada EF'in "OrderBy yok" uyarisini
        // logluyor ve o uyari status ciktisinin ortasina dusuyordu. GroupBy(_ => 1) zaten tek satir doner.
        var rows = await context.Games
            .GroupBy(_ => 1)
            .Select(grp => new
            {
                Total = grp.Count(),
                WithDescription = grp.Count(x => x.Description != null && x.Description != ""),
                Translated = grp.Count(x => x.DescriptionTr != null && x.DescriptionTr != x.Description),
                DetailPending = grp.Count(x => x.DetailSyncedAt == null),
                WithScore = grp.Count(x => x.Metacritic != null),
                NeverTried = grp.Count(x => x.Metacritic == null && x.MetacriticUrl == null)
            })
            .ToListAsync();

        var g = rows.FirstOrDefault();
        if (g == null)
        {
            Console.WriteLine("  (Games tablosu bos)");
            return;
        }

        var status = await budget.GetStatusAsync();
        var rate = gemini.UsdToTryRate;

        static string Bar(int done, int total, int width = 24)
        {
            if (total <= 0) return "";
            var filled = (int)Math.Round((double)done / total * width);
            return "[" + new string('#', filled) + new string('.', width - filled) + "]";
        }

        var detailDone = g.Total - g.DetailPending;

        Console.WriteLine();
        Console.WriteLine($"  Toplam oyun   : {g.Total:N0}");
        Console.WriteLine();
        Console.WriteLine($"  Aciklama      : {Bar(detailDone, g.Total)} {detailDone:N0}/{g.Total:N0} islendi  ({g.WithDescription:N0} aciklamali)");
        Console.WriteLine($"  Ceviri        : {Bar(g.Translated, g.WithDescription)} {g.Translated:N0}/{g.WithDescription:N0}");
        Console.WriteLine($"  Metacritic    : {g.WithScore:N0} puanli, {g.NeverTried:N0} denenmemis");
        Console.WriteLine();

        var spentTry = status.SpentUsd * rate;
        var limitTry = status.LimitUsd * rate;
        var pct = status.LimitUsd > 0 ? status.SpentUsd / status.LimitUsd * 100 : 0;

        Console.WriteLine($"  Gemini ({status.PeriodKey}) : {spentTry:F2} TL / {limitTry:F0} TL  (%{pct:F1})  {status.CallCount:N0} cagri");
        Console.WriteLine($"                  {status.SpentUsd:F4} USD / {status.LimitUsd:F2} USD   [1 USD = {rate:F1} TL varsayimi]");

        if (status.IsExhausted)
        {
            Console.WriteLine("                  BUTCE DOLDU: ceviri duruyor, ay basinda kendiliginden acilir.");
            Console.WriteLine("                  Diger job'lar (Metacritic, aciklama) etkilenmez, onlar ucretsiz.");
        }

        // Iki ayri tahmin: "su anki kuyruk" ile "isin tamami" cok farkli sayilar ve ikisini
        // karistirmak "bu is 8 TL'ye biter" gibi yanlis bir izlenim veriyordu. Ikisi de bugune
        // kadarki GERCEK olculen maliyetten turetiliyor, sabit bir katsayidan degil.
        if (status.CallCount > 0 && detailDone > 0)
        {
            var perCall = status.SpentUsd / status.CallCount;
            var queueNow = g.WithDescription - g.Translated;

            if (queueNow > 0)
            {
                Console.WriteLine($"                  Siradaki {queueNow:N0} ceviri ~ {queueNow * perCall * rate:F0} TL");
            }

            // Islenen oyunlarin yuzde kaci aciklamali cikti? Kalani da o oranda cikacaktir.
            var descRatio = (decimal)g.WithDescription / detailDone;
            var willNeed = (int)(g.DetailPending * descRatio);
            var totalRemaining = (queueNow + willNeed) * perCall;

            Console.WriteLine($"                  Isin TAMAMI  ~ {totalRemaining * rate:F0} TL  ({queueNow + willNeed:N0} ceviri, olculen {perCall:F5} USD/cagri)");

            if (status.LimitUsd > 0 && totalRemaining > status.RemainingUsd)
            {
                var months = Math.Ceiling(totalRemaining / status.LimitUsd);
                Console.WriteLine($"                  Aylik tavan {limitTry:F0} TL oldugu icin ~{months:F0} ayda tamamlanir (populer oyunlar once).");
            }
        }

        Console.WriteLine();
    }
}
