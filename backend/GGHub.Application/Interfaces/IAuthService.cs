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
    }
}