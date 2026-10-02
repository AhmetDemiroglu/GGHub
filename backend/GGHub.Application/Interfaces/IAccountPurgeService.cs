using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Silinen hesabin sitedeki izini temizler. Kullanici satiri KALIR (anonim, giris kapali):
    /// kullanici adinin tekrar alinmasini, denetim kayitlarini ve DM karsi tarafini korur.
    /// Silinen: incelemeler, yorumlar, listeler, gonderiler, begeniler, puanlar, takipler, XP ve
    /// rozetler, bildirimler, push token'lari. Baskalarinin sayaclari (begeni, yanit, oy, oyun ve
    /// liste puani) ayni islemde duzeltilir.
    /// </summary>
    public interface IAccountPurgeService
    {
        /// <summary>Tek hesabin icerigini siler. Tek transaction: ya hepsi ya hicbiri.</summary>
        Task PurgeUserContentAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>Silinmis hesaplarda kalan icerigin sayimi (silmeden once admin gorur).</summary>
        Task<DeletedAccountResidueDto> GetDeletedAccountResidueAsync(CancellationToken cancellationToken = default);

        /// <summary>Daha once silinmis ama icerigi kalmis tum hesaplari temizler; temizlenen hesap sayisini doner.</summary>
        Task<int> PurgeAllDeletedAccountsAsync(CancellationToken cancellationToken = default);
    }
}
