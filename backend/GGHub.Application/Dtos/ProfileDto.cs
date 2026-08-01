using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class ProfileDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string? HeaderImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Status { get; set; }
        public string? PhoneNumber { get; set; }
        public bool IsEmailPublic { get; set; }
        public bool IsPhoneNumberPublic { get; set; }
        public ProfileVisibilitySetting ProfileVisibility { get; set; }
        public bool IsDateOfBirthPublic { get; set; }
        public MessagePrivacySetting MessageSetting { get; set; }
        // YALNIZCA kendi profilinde (GET /profile/me) doldurulur. Gizlilik ekrani
        // bu iki alani okuyup secili secenegi isaretliyor; dondurulmezse radyo
        // gruplari varsayilansiz acilir ve kullanici kendi ayarini goremez.
        //
        // Baskasinin profilinde BILEREK doldurulmuyor: "bu kisinin gonderileri
        // takipcilere ozel" bilgisi disariya sizmasin. Doldurulmadigi icin o
        // yollarda her zaman varsayilan (Everyone) doner, yani gercek ayar hakkinda
        // hicbir sey soylemez. Yanit izni istemcide zaten PostDto.CanReply'dan
        // okunuyor, o da sunucuda hesaplaniyor.
        public PostVisibilitySetting PostVisibility { get; set; }
        public PostReplyPermissionSetting PostReplyPermission { get; set; }
        public bool IsFollowing { get; set; }
        public bool IsFollowedBy { get; set; }
        public int FollowerCount { get; set; }
        public int FollowingCount { get; set; }
        public bool IsBlockedByMe { get; set; }
        public bool IsBlockingMe { get; set; }
        public int ReviewCount { get; set; }
        public int ListCount { get; set; }

    }
}
