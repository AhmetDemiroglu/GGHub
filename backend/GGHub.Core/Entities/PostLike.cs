using System;

namespace GGHub.Core.Entities
{
    // Bilesik anahtar (UserId + PostId): ReviewCommentVote deseni.
    // "Bir kullanici bir gonderiyi tek kez begenir" kurali veritabani seviyesinde
    // garanti. ReviewVote'daki Id-PK + unique-index-yok sekli KOPYALANMAZ.
    public class PostLike
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int PostId { get; set; }
        public Post Post { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
