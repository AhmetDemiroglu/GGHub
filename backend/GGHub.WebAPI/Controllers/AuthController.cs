using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
    }
}