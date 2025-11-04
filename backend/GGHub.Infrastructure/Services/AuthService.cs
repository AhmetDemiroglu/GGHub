using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Utilities;
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
        private readonly IEmailQueue _emailQueue;
        public AuthService(GGHubDbContext context, IConfiguration config, IEmailService emailService, ILogger<AuthService> logger, IEmailQueue emailQueue)
        {
            _context = context;
            _config = config;
            _emailService = emailService;
            _logger = logger;
            _emailQueue = emailQueue;
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
            var existingUserByEmail = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == userForRegisterDto.Email.ToLower());

                    if (existingUserByEmail != null)
                    {
                        throw new InvalidOperationException("Bu e-posta adresi zaten kullanılıyor.");
                    }

                    var existingUserByUsername = await _context.Users
                        .FirstOrDefaultAsync(u => u.Username == userForRegisterDto.Username);

                    if (existingUserByUsername != null)
                    {
                        throw new InvalidOperationException("Bu kullanıcı adı zaten kullanılıyor.");
                    }
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

            var baseUrl = _config["App:BaseUrl"] ?? "https://localhost:7263";
            var verificationLink = $"{baseUrl}/api/auth/verify-email?token={user.EmailVerificationToken}";
            var emailBody = EmailTemplates.GetEmailVerificationTemplate(user.Username, verificationLink);

            _emailQueue.EnqueueEmail(new EmailJob
            {
                ToAddress = user.Email,
                Subject = "GGHub Hesap Doğrulama",
                Body = emailBody
            });

            _logger.LogInformation("Email job for {Email} enqueued.", user.Email);

            return user;
        }
        public async Task<bool> RequestPasswordResetAsync(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email.ToLower());

            if (user == null)
            {
                return true;
            }

            var resetToken = new Random().Next(100000, 999999).ToString();

            user.PasswordResetToken = resetToken;
            user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var emailBody = EmailTemplates.GetPasswordResetTemplate(user.Username, resetToken);

            _emailQueue.EnqueueEmail(new EmailJob
            {
                ToAddress = user.Email,
                Subject = "GGHub - Şifre Sıfırlama Kodu",
                Body = emailBody
            });

            _logger.LogInformation("Password reset email queued for {Email}", user.Email);

            return true;
        }

        public async Task<bool> ResetPasswordAsync(string token, string newPassword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.PasswordResetToken == token &&
                u.PasswordResetTokenExpiry > DateTime.UtcNow);

            if (user == null)
            {
                return false;
            }

            CreatePasswordHash(newPassword, out byte[] passwordHash, out byte[] passwordSalt);

            user.PasswordHash = passwordHash;
            user.PasswordSalt = passwordSalt;
            user.PasswordResetToken = null;
            user.PasswordResetTokenExpiry = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset successful for user {UserId}", user.Id);

            return true;
        }
        public async Task<bool> ChangePasswordAsync(int userId, string currentPassword, string newPassword)
        {
            var user = await _context.Users.FindAsync(userId);

            if (user == null)
            {
                return false;
            }

            if (!VerifyPasswordHash(currentPassword, user.PasswordHash, user.PasswordSalt))
            {
                _logger.LogWarning("Failed password change attempt for user {UserId} - incorrect current password", userId);
                return false;
            }

            if (currentPassword == newPassword)
            {
                throw new InvalidOperationException("Yeni şifre mevcut şifre ile aynı olamaz.");
            }

            CreatePasswordHash(newPassword, out byte[] passwordHash, out byte[] passwordSalt);

            user.PasswordHash = passwordHash;
            user.PasswordSalt = passwordSalt;
            user.UpdatedAt = DateTime.UtcNow;

            var userTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
                .ToListAsync();

            foreach (var token in userTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var emailBody = EmailTemplates.GetPasswordChangedNotification(user.Username);
            _emailQueue.EnqueueEmail(new EmailJob
            {
                ToAddress = user.Email,
                Subject = "GGHub - Şifre Değişikliği Bildirimi",
                Body = emailBody
            });

            _logger.LogInformation("Password changed successfully for user {UserId}. All sessions revoked.", userId);

            return true;
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