using System;

namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Admin panelinde bir kullanicinin gonderi listesi.
    ///
    /// Icerik HAM haliyle (token'li) degil, moderatorun okuyabilecegi COZULMUS
    /// haliyle donuyor: "@[g:340]" gibi bir metne bakarak moderasyon karari
    /// verilemez.
    /// </summary>
    public class AdminPostSummaryDto
    {
        public int Id { get; set; }
        public string? ContentPreview { get; set; }
        public string? FullContent { get; set; }
        public DateTime CreatedAt { get; set; }

        public int LikeCount { get; set; }
        public int ReplyCount { get; set; }
        public int RepostCount { get; set; }

        public int ImageCount { get; set; }
        public bool HasPoll { get; set; }

        /// <summary>Yanit ise ana gonderi kimligi; kok gonderide null.</summary>
        public int? ParentPostId { get; set; }

        /// <summary>Repost ise kaynak gonderi kimligi.</summary>
        public int? RepostOfPostId { get; set; }
    }
}
