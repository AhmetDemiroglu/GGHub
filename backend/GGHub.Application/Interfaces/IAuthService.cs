using GGHub.Application.Dtos;
using GGHub.Core.Entities;

namespace GGHub.Application.Interfaces
{
    public interface IAuthService
    {
        Task<User> Register(UserForRegisterDto userForRegisterDto);
        Task<LoginResponseDto?> Login(UserForLoginDto userForLoginDto);
        Task<LoginResponseDto?> RefreshTokenAsync(string refreshToken);
        Task<bool> VerifyEmailAsync(string token);
        Task<bool> RequestPasswordResetAsync(string email);
        Task<bool> ResetPasswordAsync(string token, string newPassword);
        Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword);
    }
}