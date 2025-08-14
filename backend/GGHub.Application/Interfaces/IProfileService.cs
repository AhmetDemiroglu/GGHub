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
        Task<ProfileDto?> GetProfileByUsernameAsync(string username, int? currentUserId = null);
        Task AnonymizeUserAsync(int userId);
        Task<UserDataExportDto> GetUserDataForExportAsync(int userId);
    }
}