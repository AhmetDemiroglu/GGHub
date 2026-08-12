namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// IGDB (Twitch) tabanli katalog senkronu. Steam yalnizca PC'yi kapsadigi ve RAWG
    /// kesintiye acik oldugu icin konsol ozel yapimlarin (PS5/Xbox/Switch) tek kaynagi.
    /// </summary>
    public interface IIgdbCatalogService
    {
        /// <summary>Kimlik bilgileri girilmis ve servis acik mi.</summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Yakin gecmis + gelecek penceresindeki cikislari ceker ve DB'yi gunceller.
        /// (eklenen, guncellenen) sayilarini dondurur. Hata halinde (0,0).
        /// </summary>
        Task<(int Added, int Updated)> SyncReleaseWindowAsync(CancellationToken ct = default);
    }
}
