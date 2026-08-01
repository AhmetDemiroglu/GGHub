using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Gonderi icindeki tipli etiket. Metinde "@[u:12]" / "@[g:340]" / "@[l:57]"
    /// token'i durur; goruntulenecek ad BILEREK token'a gomulmez, okuma aninda
    /// bu satirdan cozulur. Ayni kural NotificationService'te de gecerli
    /// (aktor adi messageArgs'a konmaz, ActorUserId'den cozulur) ki yeniden
    /// adlandirma geriye dogru yayilsin.
    ///
    /// Tablo ayrica Kesfet'in zevk grafigini besler: kullanicinin etiketledigi
    /// oyunlar TargetGameId uzerinden indeksli sekilde okunur.
    /// </summary>
    public class PostMention
    {
        public int Id { get; set; }

        public int PostId { get; set; }
        public Post Post { get; set; }

        public MentionTargetType TargetType { get; set; }

        // Uc hedeften yalnizca biri dolu olur. Hepsi Restrict: etiketlenen oyun
        // ya da liste silinince gonderi kaybolmamali, etiket cozumsuz kalmali.
        public int? TargetUserId { get; set; }
        public User? TargetUser { get; set; }

        public int? TargetGameId { get; set; }
        public Game? TargetGame { get; set; }

        public int? TargetListId { get; set; }
        public UserList? TargetList { get; set; }

        /// <summary>Token'in Content icindeki baslangic indeksi (istemci vurgusu icin).</summary>
        public int Position { get; set; }

        /// <summary>Token'in ham uzunlugu.</summary>
        public int Length { get; set; }
    }
}
