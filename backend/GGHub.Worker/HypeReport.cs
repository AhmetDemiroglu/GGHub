using GGHub.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace GGHub.Worker;

/// <summary>
/// "--hype-report" icin ay bazli hype dokumu. Salt okunur: skoru hesaplar, basar, cikar.
/// </summary>
public static class HypeReport
{
    public static async Task PrintAsync(IServiceProvider services, int year, int month)
    {
        using var scope = services.CreateScope();
        var calculator = scope.ServiceProvider.GetRequiredService<HypeScoreCalculator>();

        var start = $"{year:D4}-{month:D2}-01";
        var end = $"{year:D4}-{month:D2}-{DateTime.DaysInMonth(year, month):D2}";

        var results = await calculator.ComputeAsync(
            new HypeScoreCalculator.Options(start, end, IncludeUndated: false, UseStoredColumns: false));

        var ranked = results
            .OrderByDescending(r => r.Breakdown.Total)
            .ThenBy(r => r.Released)
            .ToList();

        var hyped = ranked.Count(r => r.Breakdown.Total >= HypeScoring.HighlightFloor);

        Console.WriteLine();
        Console.WriteLine($"  {year}-{month:D2}: {ranked.Count:N0} aday, {hyped:N0} oyun vitrin esiginin ({HypeScoring.HighlightFloor:F0}) ustunde");
        Console.WriteLine();
        Console.WriteLine("   #   Skor  Tarih       Wiki   Steam  IGDB   Meta   Oy     GGHub  Okunma    Oyun");
        Console.WriteLine("  ------------------------------------------------------------------------------------------");

        var position = 0;
        foreach (var r in ranked.Take(45))
        {
            position++;
            var b = r.Breakdown;
            var marker = position == 7 ? "  ------ vitrin ilk 6 ile biter ------\n" : string.Empty;
            Console.Write(marker);
            Console.WriteLine(
                $"  {position,2}  {b.Total,6:F1}  {r.Released}  {b.Wikipedia,5:F1}  {b.SteamSeller,5:F1}  {b.Igdb,5:F1}  " +
                $"{b.Metacritic,5:F1}  {b.IgdbVotes,5:F1}  {b.Gghub,5:F1}  {r.WikipediaViews30d ?? 0,8:N0}  {r.Name}");
        }

        Console.WriteLine();
    }
}
