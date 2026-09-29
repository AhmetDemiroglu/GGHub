using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Oyun detayinin "Benzer oyunlar" seridi. Tamamen yerel veriden hesaplanir (dis servise
    /// gitmez); veri kaynaklarini GameTagSyncJob ve katalog ingest'leri besler.
    /// </summary>
    public interface ISimilarGamesService
    {
        Task<List<GameDto>> GetSimilarGamesAsync(int rawgGameId);
    }
}
