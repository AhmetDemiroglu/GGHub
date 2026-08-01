using System;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Anket oyu. Bilesik anahtar (UserId + PollId) BILEREK secenek uzerinden
    /// DEGIL anket uzerinden kuruldu: (UserId + OptionId) olsaydi ayni kullanici
    /// birden fazla secenege oy verebilirdi. Boylece "anket basina tek oy" kurali
    /// veritabani seviyesinde garanti.
    ///
    /// OptionId normal FK ve Restrict: Poll -> Option -> Vote ile Poll -> Vote
    /// iki ayri cascade yolu olusturur, EF bunu reddeder.
    /// </summary>
    public class PostPollVote
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int PollId { get; set; }
        public PostPoll Poll { get; set; }

        public int OptionId { get; set; }
        public PostPollOption Option { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
