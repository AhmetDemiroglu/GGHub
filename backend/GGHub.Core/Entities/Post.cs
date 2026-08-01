using System;
using System.Collections.Generic;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Kisa gonderi (X benzeri). Uc rolu tek tabloda tasir:
    ///   - Kok gonderi : ParentPostId = null, RepostOfPostId = null
    ///   - Yanit       : ParentPostId dolu
    ///   - Repost      : RepostOfPostId dolu, Content null
    ///
    /// Alinti repost (Content + RepostOfPostId birlikte dolu) BILEREK simdilik
    /// uretilmiyor ama sema onu engellemiyor; ileride yalnizca servis katmani
    /// ve kart bileseni eklenerek acilabilir.
    ///
    /// Gonderiler olusturulduktan sonra DUZENLENMEZ, yalnizca silinir. Bu karar
    /// bir dizi hata sinifini bastan yok ediyor: PostMention.Position kaymasi,
    /// duzenlemede tekrar bildirim yagdirma, oy verilmis anketin degistirilmesi.
    /// Bu yuzden UpdatedAt kolonu YOK.
    /// </summary>
    public class Post
    {
        public int Id { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        /// <summary>
        /// Token'li ham metin: "@[u:12] su oyuna bayildim @[g:340]".
        /// Kullaniciya gorunen uzunluk 200 ile sinirli; buradaki 500 yalnizca
        /// depolama tavani (token'lar gorunen metinden uzun oldugu icin).
        /// Repost'ta null.
        /// </summary>
        public string? Content { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Yanit ise ana gonderi.</summary>
        public int? ParentPostId { get; set; }
        public Post? ParentPost { get; set; }
        public ICollection<Post> Replies { get; set; } = new List<Post>();

        /// <summary>Repost ise kaynak gonderi.</summary>
        public int? RepostOfPostId { get; set; }
        public Post? RepostOfPost { get; set; }
        public ICollection<Post> Reposts { get; set; } = new List<Post>();

        // Denormalize sayaclar. Kesfet aday havuzunu etkilesime gore siraliyor;
        // korelasyonlu alt sorgu ile siralamak havuz buyudukce indekslenemez hale
        // geliyor. Sayaclar ilgili islemle AYNI SaveChangesAsync icinde guncellenir.
        public int LikeCount { get; set; }
        public int ReplyCount { get; set; }
        public int RepostCount { get; set; }

        /// <summary>Demo icerik damgasi; temizlik komutu bunu kullanir.</summary>
        public bool IsSeeded { get; set; }

        public ICollection<PostLike> Likes { get; set; } = new List<PostLike>();
        public ICollection<PostImage> Images { get; set; } = new List<PostImage>();
        public ICollection<PostMention> Mentions { get; set; } = new List<PostMention>();
        public PostPoll? Poll { get; set; }
    }
}
