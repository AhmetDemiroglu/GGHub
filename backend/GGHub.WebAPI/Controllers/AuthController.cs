using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using static Org.BouncyCastle.Math.EC.ECCurve;

namespace GGHub.WebAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("LoginPolicy")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IConfiguration _config;
        public AuthController(IAuthService authService, IConfiguration config)
        {
            _authService = authService;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(UserForRegisterDto userForRegisterDto)
        {
            try
            {
                var user = await _authService.Register(userForRegisterDto);
                return Ok(new { message = "Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Kayıt sırasında bir hata oluştu." });
            }
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto userForLoginDto)
        {
            try
            {
                var response = await _authService.Login(userForLoginDto);

                if (response == null)
                {
                    return Unauthorized(new { message = "E-posta veya şifre hatalı." });
                }

                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Giriş sırasında bir hata oluştu." });
            }
        }
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto refreshTokenDto)
        {
            var result = await _authService.RefreshTokenAsync(refreshTokenDto.RefreshToken); 
            if (result == null)
            {
                return Unauthorized("Geçersiz Refresh Token.");
            }
            return Ok(result);
        }
        [HttpGet("verify-email")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyEmail([FromQuery] string token)
        {
            var frontendBaseUrl = _config["App:FrontendBaseUrl"] ?? "http://localhost:3000";

            var success = await _authService.VerifyEmailAsync(token);
            if (!success)
            {
                return Redirect($"{frontendBaseUrl}/login?verified=false");
            }

            return Redirect($"{frontendBaseUrl}/login?verified=true");
        }
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword(PasswordResetRequestDto requestDto)
        {
            try
            {
                await _authService.RequestPasswordResetAsync(requestDto.Email);
                return Ok(new { message = "Eğer bu e-posta kayıtlıysa, şifre sıfırlama kodu gönderildi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Bir hata oluştu. Lütfen tekrar deneyin." });
            }
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword(PasswordResetDto resetDto)
        {
            try
            {
                var success = await _authService.ResetPasswordAsync(resetDto.Token, resetDto.NewPassword);

                if (!success)
                {
                    return BadRequest(new { message = "Geçersiz veya süresi dolmuş kod." });
                }

                return Ok(new { message = "Şifreniz başarıyla güncellendi." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Bir hata oluştu. Lütfen tekrar deneyin." });
            }
        }
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto changePasswordDto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Geçersiz kullanıcı bilgisi." });
                }

                var success = await _authService.ChangePasswordAsync(
                    userId,
                    changePasswordDto.CurrentPassword,
                    changePasswordDto.NewPassword
                );

                if (!success)
                {
                    return BadRequest(new { message = "Mevcut şifre hatalı." });
                }

                return Ok(new { message = "Şifreniz başarıyla güncellendi. Tüm oturumlarınız sonlandırıldı." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Şifre değiştirme sırasında bir hata oluştu." });
            }
        }
    }
}