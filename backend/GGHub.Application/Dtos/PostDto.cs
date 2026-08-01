using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using GGHub.Application.Localization;
using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class PostDto
    {
        public int Id { get; set; }

        /// <summary>
        /// Token'li ham metin ("@[u:12] harika @[g:340]"). Istemci token'lari
        /// Mentions listesiyle eslestirip renkli cip olarak cizer; cozulemeyen
        /// token duz gri metne duser.
        /// </summary>
        public string? Content { get; set; }

        public DateTime CreatedAt { get; set; }

        public UserDto Author { get; set; } = null!;

        public int LikeCount { get; set; }
        public int ReplyCount { get; set; }
        public int RepostCount { get; set; }

        /// <summary>Isteyen kullanici bu gonderiyi begendi mi.</summary>
        public bool IsLiked { get; set; }

        /// <summary>Isteyen kullanici bu gonderiyi repost etti mi.</summary>
        public bool IsReposted { get; set; }

        /// <summary>
        /// Isteyen kullanici bu gonderiye yanit verebilir mi. Istemci yanit
        /// kutusunu buna gore gizler; sunucu yazma aninda AYRICA dogrular
        /// (istemciye guvenilmez).
        /// </summary>
        public bool CanReply { get; set; }

        /// <summary>Gonderi silinebilir mi (sahibi ya da Admin).</summary>
        public bool CanDelete { get; set; }

        /// <summary>Yanitsa ana gonderinin kimligi.</summary>
        public int? ParentPostId { get; set; }

        /// <summary>Yanitsa ana gonderinin yazarinin kullanici adi (baglam satiri).</summary>
        public string? ParentAuthorUsername { get; set; }

        /// <summary>Repost ise kaynak gonderi. Ic ice repost olmaz, tek seviye.</summary>
        public PostDto? RepostOf { get; set; }

        public List<PostImageDto> Images { get; set; } = new();
        public List<PostMentionDto> Mentions { get; set; } = new();
        public PostPollDto? Poll { get; set; }
    }

    public class PostImageDto
    {
        public string Url { get; set; } = string.Empty;
        public int? Width { get; set; }
        public int? Height { get; set; }
        public int Position { get; set; }
    }

    /// <summary>
    /// Cozulmus etiket. Display BILEREK gonderi metninde saklanmaz, her okumada
    /// buradan gelir; boylece kullanici adi / oyun adi / liste adi degisince
    /// eski gonderiler de guncel adi gosterir.
    /// </summary>
    public class PostMentionDto
    {
        public MentionTargetType Type { get; set; }
        public int Id { get; set; }
        public string Display { get; set; } = string.Empty;

        /// <summary>Oyun icin slug, kisi icin kullanici adi, liste icin id metni.</summary>
        public string? Slug { get; set; }

        /// <summary>
        /// false ise hedef silinmis YA DA isteyen kullanici onu goremiyor
        /// (ozel liste, gizli profil). Istemci link degil duz gri metin basar.
        /// </summary>
        public bool Resolved { get; set; }
    }

    public class PostPollDto
    {
        public int Id { get; set; }
        public DateTime EndsAt { get; set; }
        public bool IsClosed { get; set; }
        public int TotalVotes { get; set; }

        /// <summary>Isteyen kullanicinin oy verdigi secenek; yoksa null.</summary>
        public int? MyOptionId { get; set; }

        public List<PostPollOptionDto> Options { get; set; } = new();
    }

    public class PostPollOptionDto
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public int Position { get; set; }

        /// <summary>
        /// Oy sayisi. Anket kapanmadan ve kullanici oy vermeden once istemcide
        /// GOSTERILMEZ; sunucu yine de doner cunku oy verir vermez animasyonla
        /// aciliyor ve ikinci bir tur beklemek gecikme yaratirdi.
        /// </summary>
        public int VoteCount { get; set; }
    }

    public class PostForCreationDto
    {
        // 500 = DEPOLAMA tavani, kullaniciya gosterilen sinir degil. Token'lar
        // ("@[g:12345]") gorunen metinden uzun oldugu icin ham metin daha uzun
        // olabilir. Kullaniciya gorunen 200 karakter sinirini PostService
        // token'lari cozdukten SONRA dogruluyor.
        [StringLength(500, ErrorMessageResourceType = typeof(AppValidationText),
            ErrorMessageResourceName = nameof(AppValidationText.PostContentLength))]
        public string? Content { get; set; }

        /// <summary>Onceden /api/photos/post ile yuklenmis gorsel adresleri. En fazla 4.</summary>
        public List<string> ImageUrls { get; set; } = new();

        public PostPollForCreationDto? Poll { get; set; }

        /// <summary>Yanitsa ana gonderi kimligi.</summary>
        public int? ParentPostId { get; set; }
    }

    public class PostPollForCreationDto
    {
        public List<string> Options { get; set; } = new();

        /// <summary>1-7 gun.</summary>
        public int DurationDays { get; set; } = 1;
    }

    public class PostPollVoteDto
    {
        public int OptionId { get; set; }
    }

    /// <summary>Begeni/repost uclarinin donusu; istemci sayaci iyimser guncelledikten sonra buna hizalanir.</summary>
    public class PostInteractionResultDto
    {
        public int PostId { get; set; }
        public int LikeCount { get; set; }
        public int RepostCount { get; set; }
        public bool IsLiked { get; set; }
        public bool IsReposted { get; set; }
    }
}
