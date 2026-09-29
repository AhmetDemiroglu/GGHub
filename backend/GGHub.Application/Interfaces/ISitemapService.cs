using GGHub.Application.Dtos;
using GGHub.Application.DTOs.Common;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Arama motoru sitemap'leri icin hafif listeler: yalnizca herkese acik ve dizine girmeye
    /// deger kayitlar (kalite esigini gecen oyunlar, Public listeler, icerigi olan Public profiller).
    /// </summary>
    public interface ISitemapService
    {
        Task<PaginatedResult<SitemapEntryDto>> GetGamesAsync(int page, int pageSize);
        Task<PaginatedResult<SitemapEntryDto>> GetListsAsync(int page, int pageSize);
        Task<PaginatedResult<SitemapEntryDto>> GetProfilesAsync(int page, int pageSize);
    }
}
