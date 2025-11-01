using Amazon.Runtime.Internal.Util;
using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace GGHub.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly GGHubDbContext _context;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;
        private readonly ILogger<AuthService> _logger;

        public AuthService(GGHubDbContext context, IConfiguration config, IEmailService emailService, ILogger<AuthService> logger)
        {
            _context = context;
            _config = config;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<LoginResponseDto?> Login(UserForLoginDto userForLoginDto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userForLoginDto.Email.ToLower());

            if (user == null || !VerifyPasswordHash(userForLoginDto.Password, user.PasswordHash, user.PasswordSalt))
            {
                return null;
            }

            if (!user.IsEmailVerified)
            {
                throw new InvalidOperationException("Giriş yapmadan önce e-posta adresinizi doğrulamanız gerekmektedir.");
            }

            var accessToken = CreateToken(user);
            var refreshToken = new RefreshToken
            {
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();

            return new LoginResponseDto
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token
            };
        }
        public async Task<bool> VerifyEmailAsync(string token)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);
            if (user == null)
            {
                return false; 
            }

            user.IsEmailVerified = true;
            user.EmailVerificationToken = null; 
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        public async Task<LoginResponseDto?> RefreshTokenAsync(string token)
        {
            var refreshToken = await _context.RefreshTokens
                .Include(rt => rt.User) 
                .FirstOrDefaultAsync(rt => rt.Token == token);

            if (refreshToken == null || refreshToken.ExpiresAt <= DateTime.UtcNow || refreshToken.RevokedAt != null)
            {
                return null;
            }

            var newAccessToken = CreateToken(refreshToken.User);
            var newRefreshToken = new RefreshToken
            {
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                UserId = refreshToken.UserId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            refreshToken.RevokedAt = DateTime.UtcNow;

            await _context.RefreshTokens.AddAsync(newRefreshToken);
            await _context.SaveChangesAsync();

            return new LoginResponseDto
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken.Token
            };
        }
        public async Task<User> Register(UserForRegisterDto userForRegisterDto)
        {
            CreatePasswordHash(userForRegisterDto.Password, out byte[] passwordHash, out byte[] passwordSalt);
            var user = new User
            {
                Email = userForRegisterDto.Email.ToLower(),
                Username = userForRegisterDto.Username,
                PasswordHash = passwordHash,
                PasswordSalt = passwordSalt,
                EmailVerificationToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64))
                                            .Replace("/", "-").Replace("+", "_")
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            //var verificationLink = $"https://localhost:7263/api/auth/verify-email?token={user.EmailVerificationToken}";
            var baseUrl = _config["App:BaseUrl"];
            var verificationLink = $"{baseUrl}/api/auth/verify-email?token={user.EmailVerificationToken}";

            var emailBody = $"Merhaba {user.Username},<br>GGHub hesabınızı doğrulamak için lütfen <a href='{verificationLink}'>bu linke</a> tıklayın.";

#pragma warning disable CS4014
            Task.Run(async () => {
                try
                {
                    // _emailService'i ve config'i (Titan) GEÇİCİ OLARAK BYPASS EDİYORUZ.
                    // Eski development.json'daki GMAIL ayarlarını elle (hardcode) giriyoruz.

                    using var smtp = new MailKit.Net.Smtp.SmtpClient();
                    smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                    var host = "smtp.gmail.com";
                    var port = 587; // Gmail için 587 ve StartTls
                    var fromAddress = "gghub.mailer@gmail.com"; // development.json'daki mailer adresin
                    var appPassword = "ogdntffewujckffl"; // development.json'daki app şifren
                    var fromName = "GGHub DUMAN TESTİ";

                    // Gmail'e bağlan
                    await smtp.ConnectAsync(host, port, MailKit.Security.SecureSocketOptions.StartTls);
                    await smtp.AuthenticateAsync(fromAddress, appPassword);

                    // Maili oluştur
                    var email = new MimeKit.MimeMessage();
                    email.From.Add(new MimeKit.MailboxAddress(fromName, fromAddress));
                    email.To.Add(MimeKit.MailboxAddress.Parse(user.Email)); // Kayıt olan kullanıcının adresi
                    email.Subject = "GGHub GMAIL DUMAN TESTİ";
                    email.Body = new MimeKit.TextPart(MimeKit.Text.TextFormat.Html) { Text = $"Bu mail Gmail'den geliyorsa, sorun GoDaddy/Titan'dadır.<br><br>Test Linki (hala çalışmayacak): {emailBody}" };

                    await smtp.SendAsync(email);
                    await smtp.DisconnectAsync(true);

                    _logger.LogInformation("GMAIL DUMAN TESTİ: Başarıyla gönderildi {Email}", user.Email);
                }
                catch (Exception ex)
                {
                    // Eğer GMAIL BİLE başarısız olursa, sorun Railway'in ağındadır.
                    _logger.LogError(ex, "GMAIL DUMAN TESTİ: BAŞARISIZ OLDU. Hata: {ErrorMessage}", ex.Message);
                }
            });
#pragma warning restore CS4014
            return user;
        }
        private bool VerifyPasswordHash(string password, byte[] passwordHash, byte[] passwordSalt)
        {
            using (var hmac = new System.Security.Cryptography.HMACSHA512(passwordSalt))
            {
                var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
                return computedHash.SequenceEqual(passwordHash);
            }
        }
        private void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            using (var hmac = new System.Security.Cryptography.HMACSHA512())
            {
                passwordSalt = hmac.Key;
                passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
            }
        }
        private string CreateToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config.GetSection("JwtSettings:Key").Value!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddHours(1),
                SigningCredentials = creds,
                Issuer = _config.GetSection("JwtSettings:Issuer").Value,
                Audience = _config.GetSection("JwtSettings:Audience").Value
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }
    }
}