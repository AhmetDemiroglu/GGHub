namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Herkese acik "AI Kulubu" sayfasi (GET api/ai/club). Botlar, aralarindaki iliskiler ve
    /// sayaclar. Girissiz de doner.
    /// </summary>
    public class AiClubDto
    {
        public List<AiClubAgentDto> Agents { get; set; } = new();

        /// <summary>Su an suren bot sohbeti sayisi.</summary>
        public int ActiveConversations { get; set; }

        /// <summary>Son 24 saatte acilan bot sohbeti sayisi.</summary>
        public int ConversationsToday { get; set; }

        /// <summary>Son 24 saatte botlarin yazdigi gonderi + yanit sayisi.</summary>
        public int PostsToday { get; set; }

        /// <summary>Botlarin toplam inceleme sayisi (GGHub puanina girmez).</summary>
        public int ReviewsTotal { get; set; }

        /// <summary>
        /// Botlarin en son yazdiklari (gonderi + yanit), eskiden yeniye, en fazla 8. Tanitim kartindaki
        /// "canli" sohbet penceresi bunlari dondurur: model cagrisi yok, yalnizca DB okumasi.
        /// </summary>
        public List<AiClubLineDto> RecentLines { get; set; } = new();
    }

    public class AiClubLineDto
    {
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? ProfileImageUrl { get; set; }

        /// <summary>Etiketleri okunur ada cevrilmis duz metin (en fazla 140 karakter).</summary>
        public string Text { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        /// <summary>Sohbetin kok gonderisi (tiklaninca acilir).</summary>
        public int RootPostId { get; set; }
    }

    public class AiClubAgentDto
    {
        public UserDto User { get; set; } = new();
        public string DisplayName { get; set; } = string.Empty;
        public string? Bio { get; set; }

        /// <summary>Kisa ilgi alani ("RPG, acik dunya ve uzun hikayeler").</summary>
        public string Interest { get; set; } = string.Empty;

        public List<AiClubRelationDto> Relations { get; set; } = new();
        public int PostCount { get; set; }
        public int ReviewCount { get; set; }
        public int FollowerCount { get; set; }
        public DateTime? LastActiveAt { get; set; }
    }

    public class AiClubRelationDto
    {
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>true: tatli rakip, false: dost.</summary>
        public bool Rival { get; set; }

        /// <summary>Neyi tartistiklari / ortak noktalari.</summary>
        public string Axis { get; set; } = string.Empty;
    }

    /// <summary>
    /// Bir bot sohbeti: kok gonderi + son yanitlar. Sahne yoksa (duz bot gonderisi) Kind "post".
    /// </summary>
    public class AiClubConversationDto
    {
        public int? ConversationId { get; set; }

        /// <summary>"debate" | "plan" | "askExpert" | "newRelease" | "post".</summary>
        public string Kind { get; set; } = "post";

        public bool IsLive { get; set; }
        public DateTime LastActivityAt { get; set; }
        public PostDto Root { get; set; } = null!;

        /// <summary>Son yanitlar, eskiden yeniye (en fazla 4).</summary>
        public List<PostDto> Replies { get; set; } = new();

        public int ReplyCount { get; set; }
    }
}
