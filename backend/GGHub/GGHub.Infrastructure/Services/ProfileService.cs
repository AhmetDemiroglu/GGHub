using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Enums;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GGHub.Infrastructure.Services
{
    public class ProfileService : IProfileService
    {
        private readonly GGHubDbContext _context;
        private readonly IAuditService _auditService;

        public ProfileService(GGHubDbContext context, IAuditService auditService) 
        {
            _context = context;
            _auditService = auditService;
        }

        public async Task<ProfileDto?> GetProfileAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null || user.IsDeleted)
            {
                return null;
            }

            return new ProfileDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Bio = user.Bio,
                ProfileImageUrl = user.ProfileImageUrl,
                DateOfBirth = user.DateOfBirth,
                CreatedAt = user.CreatedAt,
                Status = user.Status
            };
        }

        public async Task<ProfileDto?> UpdateProfileAsync(int userId, ProfileForUpdateDto profileDto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.IsDeleted) return null;

            user.FirstName = profileDto.FirstName;
            user.LastName = profileDto.LastName;
            user.Bio = profileDto.Bio;
            user.ProfileImageUrl = profileDto.ProfileImageUrl;
            user.PhoneNumber = profileDto.PhoneNumber;
            user.IsEmailPublic = profileDto.IsEmailPublic;
            user.IsPhoneNumberPublic = profileDto.IsPhoneNumberPublic;
            user.DateOfBirth = profileDto.DateOfBirth;
            user.Status = profileDto.Status;
                        user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(userId, "UpdateProfile", "User", userId, profileDto);

            return await GetProfileAsync(userId);
        }

        public async Task UpdateMessageSettingAsync(int userId, MessagePrivacySetting newSetting)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return;

            user.MessageSetting = newSetting;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        public async Task UpdateProfileVisibilityAsync(int userId, ProfileVisibilitySetting newVisibility)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return;

            user.ProfileVisibility = newVisibility;
            user.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        public async Task<ProfileDto?> GetProfileByUsernameAsync(string username, int? currentUserId = null)
        {
            var profileUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (profileUser == null || profileUser.IsDeleted) return null;

            if (profileUser.ProfileVisibility == ProfileVisibilitySetting.Private && profileUser.Id != currentUserId)
            {
                return null;
            }
            if (profileUser.ProfileVisibility == ProfileVisibilitySetting.Followers && profileUser.Id != currentUserId)
            {
                if (currentUserId == null || !await _context.Follows.AnyAsync(f => f.FolloweeId == profileUser.Id && f.FollowerId == currentUserId))
                {
                    return null;
                }
            }
            return new ProfileDto
            {
                Id = profileUser.Id,
                Username = profileUser.Username,
                Email = (profileUser.IsEmailPublic || profileUser.Id == currentUserId) ? profileUser.Email : null,
                FirstName = profileUser.FirstName,
                LastName = profileUser.LastName,
                Bio = profileUser.Bio,
                ProfileImageUrl = profileUser.ProfileImageUrl,
                DateOfBirth = profileUser.DateOfBirth,
                CreatedAt = profileUser.CreatedAt,
                PhoneNumber = (profileUser.IsPhoneNumberPublic || profileUser.Id == currentUserId) ? profileUser.PhoneNumber : null,
                Status = profileUser.Status
            };
        }
        public async Task AnonymizeUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.IsDeleted)
            {
                return; 
            }

            user.Username = $"deleted_user_{user.Id}";
            user.Email = $"{user.Id}@deleted.local";
            user.FirstName = null;
            user.LastName = null;
            user.Bio = null;
            user.ProfileImageUrl = null;
            user.DateOfBirth = null;
            user.Status = null;
            user.PhoneNumber = null;
            user.IsEmailVerified = false;
            user.EmailVerificationToken = null;

            user.PasswordHash = new byte[0];
            user.PasswordSalt = new byte[0];

            user.IsDeleted = true;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
        public async Task<UserDataExportDto> GetUserDataForExportAsync(int userId)
        {
            var userProfile = await GetProfileAsync(userId);
            if (userProfile == null)
            {
                throw new KeyNotFoundException("Kullanıcı bulunamadı.");
            }

            var userReviews = await _context.Reviews
                .Where(r => r.UserId == userId)
                .Include(r => r.User) 
                .Select(r => new ReviewDto
                {
                    Id = r.Id,
                    Content = r.Content,
                    Rating = r.Rating,
                    CreatedAt = r.CreatedAt,
                    User = new UserDto
                    {
                        Id = r.User.Id,
                        Username = r.User.Username
                    }
                })
                .ToListAsync();

            var userLists = await _context.UserLists
                .Where(l => l.UserId == userId)
                .Include(l => l.UserListGames)
                    .ThenInclude(ulg => ulg.Game) 
                .Select(l => new UserListDetailDto
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    IsPublic = l.IsPublic,
                    UpdatedAt = l.UpdatedAt,
                    FollowerCount = l.Followers.Count(),
                    Games = l.UserListGames.Select(ulg => new GameSummaryDto
                    {
                        Id = ulg.Game.Id,
                        RawgId = ulg.Game.RawgId,
                        Name = ulg.Game.Name,
                        Slug = ulg.Game.Slug,
                        CoverImage = ulg.Game.CoverImage,
                        BackgroundImage = ulg.Game.BackgroundImage,
                        Released = ulg.Game.Released
                    }).ToList()
                })
                .ToListAsync();

            var userMessages = await _context.Messages
                .Where(m => m.SenderId == userId || m.RecipientId == userId)
                .Include(m => m.Sender)
                .Include(m => m.Recipient)
                .OrderByDescending(m => m.SentAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    SenderUsername = m.Sender.Username,
                    RecipientId = m.RecipientId,
                    RecipientUsername = m.Recipient.Username,
                    Content = m.Content,
                    ReadAt = m.ReadAt,
                    SentAt = m.SentAt
                })
                .ToListAsync();

            return new UserDataExportDto
            {
                Profile = userProfile,
                Reviews = userReviews,
                Lists = userLists,
                Messages = userMessages
            };
        }
    }
}