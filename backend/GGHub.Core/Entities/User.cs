using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        /// <summary>
        /// Kullanici adinin benzersizlik ve arama ANAHTARI. <see cref="Username"/> ise
        /// GORUNEN formdur ve kullanicinin yazdigi hali (ornegin "Ömer") korur.
        /// Deger daima <c>UsernameNormalizer.Normalize(Username)</c> ile uretilir.
        ///
        /// Nullable olmasinin TEK sebebi, production'da backfill (UsernameNormalizationSeeder)
        /// henuz kosmamis satirlarin bulunabilmesidir. Backfill dogrulandiktan sonra takip eden
        /// bir migration bu kolonu NOT NULL + UNIQUE yapacaktir.
        /// </summary>
        public string? UsernameNormalized { get; set; }
        public string Email { get; set; }
        // Nullable: social-only accounts (Google/Apple) have no password.
        public byte[]? PasswordHash { get; set; }
        public byte[]? PasswordSalt { get; set; }
        // External auth provider subject ids (null when not linked). A single user may link both.
        public string? GoogleId { get; set; }
        public string? AppleId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? HeaderImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public string Role { get; set; } = "User";
        public ICollection<Follow> Following { get; set; } = new List<Follow>();
        public ICollection<Follow> Followers { get; set; } = new List<Follow>();
        public ICollection<UserListFollow> FollowedLists { get; set; } = new List<UserListFollow>();
        public ICollection<Message> MessagesSent { get; set; } = new List<Message>();
        public ICollection<Message> MessagesReceived { get; set; } = new List<Message>();
        public ICollection<UserBlock> BlockedUsers { get; set; } = new List<UserBlock>();
        public ICollection<UserBlock> BlockedByUsers { get; set; } = new List<UserBlock>();
        public MessagePrivacySetting MessageSetting { get; set; } = MessagePrivacySetting.Everyone;
        public ProfileVisibilitySetting ProfileVisibility { get; set; } = ProfileVisibilitySetting.Public;

        // Gonderi gizliligi BILEREK Post satirinda degil burada duruyor: ayar canli
        // uygulanir, degistirildigi anda gecmis gonderiler de etkilenir. Gonderiye
        // kopyalansaydi ayari sikilastirmak eski gonderileri gizlemez, surpriz
        // sizinti birakirdi. Kural PostAccess (bellek ici) ve PostQueryExtensions
        // (EF) ikilisinde tek kaynaktan uygulanir.
        public PostVisibilitySetting PostVisibility { get; set; } = PostVisibilitySetting.Everyone;
        public PostReplyPermissionSetting PostReplyPermission { get; set; } = PostReplyPermissionSetting.Everyone;
        public string? Status { get; set; }
        public string? PhoneNumber { get; set; }
        public bool IsEmailPublic { get; set; } = false; 
        public bool IsPhoneNumberPublic { get; set; } = false;
        public bool IsEmailVerified { get; set; } = false;
        public string? EmailVerificationToken { get; set; }
        public bool IsDateOfBirthPublic { get; set; } = false;
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiry { get; set; }
        public bool IsBanned { get; set; } = false;
        public DateTime? BannedAt { get; set; }
        public string? BanReason { get; set; }
        public UserStats? Stats { get; set; }
        public ICollection<UserAchievement> Achievements { get; set; } = new List<UserAchievement>();

        /// <summary>
        /// Demo icerik damgasi. Yalnizca DemoContentSeeder true yazar; temizlik
        /// komutu seed kullanicilarini ve gonderilerini bu bayrakla bulur.
        /// Gercek kullanicilarda her zaman false.
        /// </summary>
        public bool IsSeeded { get; set; } = false;

        /// <summary>
        /// Kullanicinin son bilinen arayuz dili ("tr" | "en-US"), giris/kayit anindaki
        /// Accept-Language'dan yazilir.
        ///
        /// NEDEN gerekli: arka plan job'larinda istek kulturu YOKTUR, dolayisiyla
        /// AppText.CurrentLocale() container varsayilanina duser. Mobil cihazlar icin
        /// PushToken.Locale bu bilgiyi tasiyor ama YALNIZCA web'den giren kullanicilarda
        /// baska hicbir sinyal yok. Cozum sirasi: PushToken.Locale -> PreferredLocale -> "tr".
        /// </summary>
        public string? PreferredLocale { get; set; }
    }
}