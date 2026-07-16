using System.Collections.Generic;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Metin icindeki @kullaniciadi bahislerini cozup bildirim uretir.
    ///
    /// Bahis icin ayri bir tablo YOK: bahis, mevcut Content kolonundaki duz metnin
    /// kendisidir. Kullanici adlari degistirilemez oldugu icin (ProfileForUpdateDto'da
    /// Username alani yok) ham "@ad" metnini saklamak yeniden adlandirmaya karsi guvenli.
    ///
    /// Bahis bildirimi push gibi "best-effort"tur: bu servisteki hicbir hata cagirani
    /// bozmaz, gonderi/yorum her halukarda kaydedilmis kalir.
    ///
    /// Handle cikarma (ExtractHandles) implementasyonda public static olarak durur;
    /// test icin dogrudan MentionService.ExtractHandles(...) cagrilir. Arayuze
    /// static abstract olarak konmadi: oyle bir uye yalnizca generic kisit uzerinden
    /// cagrilabilirdi ve test/cagri tarafini gereksiz karmasiklastirirdi.
    /// </summary>
    public interface IMentionService
    {
        /// <summary>
        /// content icindeki bahisleri cozer ve her birine Mention bildirimi gonderir.
        /// </summary>
        /// <param name="excludeUserIds">
        /// Ayni olay icin ZATEN bildirim almis kullanicilar. Ust yorum sahibini de etiketleyen
        /// bir yanit, iki degil TEK bildirim uretsin diye buraya gecilir.
        /// </param>
        Task NotifyMentionsAsync(
            int actorUserId,
            string? content,
            string messageKey,
            string link,
            IEnumerable<int>? excludeUserIds = null);

        /// <summary>
        /// Duzenleme akisi: yalnizca YENI eklenen bahislere bildirim gonderir.
        /// Aksi halde her duzenlemede ayni kisiler tekrar tekrar bildirim alirdi.
        /// </summary>
        Task NotifyNewMentionsAsync(
            int actorUserId,
            string? oldContent,
            string? newContent,
            string messageKey,
            string link,
            IEnumerable<int>? excludeUserIds = null);
    }
}
