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

            var createdUser = await _authService.Register(userForRegisterDto);
            return StatusCode(201);
        }
        [HttpPost("login")]
        public async Task<IActionResult> Login(UserForLoginDto userForLoginDto)
        {
            try
            {
                var loginResponse = await _authService.Login(userForLoginDto);

                if (loginResponse == null)
                {
                    return Unauthorized("Kullanıcı adı veya şifre hatalı.");
                }
                return Ok(loginResponse);
            }
            catch (InvalidOperationException ex)
            {
                return Unauthorized(ex.Message);
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