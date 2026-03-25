using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Localization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

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
                await _authService.Register(userForRegisterDto);
                return Ok(new { message = AppText.Get("auth.registerSuccess") });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = AppText.Get("auth.registerError") });
            }
        }

        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto userForLoginDto)
        {
            try
            {
                var response = await _authService.Login(userForLoginDto);

                if (response == null)
                {
                    return Unauthorized(new { message = AppText.Get("auth.loginInvalid") });
                }

                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = AppText.Get("auth.loginError") });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto refreshTokenDto)
        {
            var result = await _authService.RefreshTokenAsync(refreshTokenDto.RefreshToken);
            if (result == null)
            {
                return Unauthorized(new { message = AppText.Get("auth.invalidRefreshToken") });
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
                return Ok(new { message = AppText.Get("auth.forgotPasswordSuccess") });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = AppText.Get("auth.genericRetry") });
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
                    return BadRequest(new { message = AppText.Get("auth.resetPasswordInvalid") });
                }

                return Ok(new { message = AppText.Get("auth.passwordUpdated") });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = AppText.Get("auth.genericRetry") });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto changePasswordDto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                {
                    return Unauthorized(new { message = AppText.Get("auth.invalidUserInfo") });
                }

                var success = await _authService.ChangePasswordAsync(
                    userId,
                    changePasswordDto.CurrentPassword,
                    changePasswordDto.NewPassword
                );

                if (!success)
                {
                    return BadRequest(new { message = AppText.Get("auth.currentPasswordInvalid") });
                }

                return Ok(new { message = AppText.Get("auth.passwordUpdatedSessionsRevoked") });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception)
            {
                return StatusCode(500, new { message = AppText.Get("auth.changePasswordError") });
            }
        }
    }
}
