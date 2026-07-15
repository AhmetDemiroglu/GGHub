namespace GGHub.Application.Dtos
{
    /// <summary>
    /// "Tanıyor olabileceğin kişiler" önerisi. UserDto alan kümesinin üst kümesidir;
    /// mobil SocialProfile şemasıyla geriye dönük uyumludur.
    /// </summary>
    public class SuggestedUserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public bool IsFollowing { get; set; }
        public bool IsProfileAccessible { get; set; }

        /// <summary>Ortak takip edilen kişi sayısı (friends-of-friends sinyali).</summary>
        public int MutualFollowerCount { get; set; }

        /// <summary>Ortak oyun sayısı (review + liste kesişimi, zevk benzerliği sinyali).</summary>
        public int SharedGameCount { get; set; }

        /// <summary>Bu kullanıcı beni takip ediyor mu ("seni takip ediyor" rozeti).</summary>
        public bool FollowsYou { get; set; }

        public int FollowerCount { get; set; }

        /// <summary>Önerinin baskın nedeni: mutual | taste | follows_you | popular.</summary>
        public string Reason { get; set; } = "popular";
    }
}
