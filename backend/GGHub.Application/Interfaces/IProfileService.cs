using GGHub.Application.Dtos;
using GGHub.Core.Enums;

namespace GGHub.Application.Interfaces
{
    public interface IProfileService
    {
        Task<ProfileDto?> GetProfileAsync(int userId);
        Task<ProfileDto?> UpdateProfileAsync(int userId, ProfileForUpdateDto profileDto);
        Task UpdateMessageSettingAsync(int userId, MessagePrivacySetting newSetting);
        Task UpdateProfileVisibilityAsync(int userId, ProfileVisibilitySetting newVisibility);
        Task UpdatePostVisibilityAsync(int userId, PostVisibilitySetting newVisibility);
        Task UpdatePostReplyPermissionAsync(int userId, PostReplyPermissionSetting newPermission);
        Task<ProfileDto?> GetProfileByUsernameAsync(string username, int? currentUserId = null);

        /// <summary>
        /// Kutlama sayfasinin verisi. Dogum tarihi kayitli degilse, kullanici silinmis veya
        /// banlanmissa NULL doner (controller 404'e cevirir): "dogum tarihi yoksa URL hic
        /// calismasin" kurali UI'da degil VERI KATMANINDA uygulanir.
        /// </summary>
        Task<BirthdayDto?> GetBirthdayAsync(int userId);
        Task AnonymizeUserAsync(int userId);
        Task<UserDataExportDto> GetUserDataForExportAsync(int userId);
    }
}