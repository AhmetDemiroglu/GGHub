using GGHub.Application.Dtos;
using GGHub.Application.Interfaces;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using GGHub.Infrastructure.Utilities;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
        private readonly ILogger<AuthService> _logger;
        private readonly IEmailQueue _emailQueue;
        private readonly IGamificationService _gamificationService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;

        public AuthService(GGHubDbContext context, IConfiguration config, IEmailService emailService, ILogger<AuthService> logger, IEmailQueue emailQueue, IGamificationService gamificationService, IHttpClientFactory httpClientFactory, IMemoryCache cache)
        {
            _context = context;
            _config = config;
            _logger = logger;
            _emailQueue = emailQueue;
            _gamificationService = gamificationService;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
        }

        public async Task<LoginResponseDto?> Login(UserForLoginDto userForLoginDto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email == userForLoginDto.Email.ToLower() ||
                u.Username.ToLower() == userForLoginDto.Email.ToLower());

            // PasswordHash/Salt are null for social-only (Google/Apple) accounts → treat as invalid credentials.
            if (user == null || user.PasswordHash == null || user.PasswordSalt == null ||
                !VerifyPasswordHash(userForLoginDto.Password, user.PasswordHash, user.PasswordSalt))
            {
                return null;
            }

            if (!user.IsEmailVerified)
            {
                throw new InvalidOperationException(AppText.Get("auth.verifyEmailRequired"));
            }

            if (user.IsBanned)
            {
                throw new InvalidOperationException(AppText.Get("auth.accountSuspended"));
            }

            return await IssueTokensAsync(user);
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
                if (existingUserByEmail.IsBanned)
                {
                    throw new InvalidOperationException(AppText.Get("auth.emailAccountSuspended"));
                }
                throw new InvalidOperationException(AppText.Get("auth.emailAlreadyInUse"));
            }

            var existingUserByUsername = await _context.Users
                .FirstOrDefaultAsync(u => u.Username.ToLower() == userForRegisterDto.Username.ToLower());

            if (existingUserByUsername != null)
            {
                if (existingUserByUsername.IsBanned)
                {
                    throw new InvalidOperationException(AppText.Get("auth.usernameAccountSuspended"));
                }
                throw new InvalidOperationException(AppText.Get("auth.usernameAlreadyInUse"));
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
                Subject = AppText.Get("auth.emailVerificationSubject"),
                Body = emailBody
            });

            _logger.LogInformation("Email job for {Email} enqueued.", user.Email);

            await _gamificationService.AddXpAsync(user.Id, 50, "Welcome");
            await _gamificationService.CheckAchievementsAsync(user.Id, "Welcome");

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
                Subject = AppText.Get("auth.passwordResetSubject"),
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

            // Social-only accounts (null password) cannot "change" a password via the current-password flow.
            if (user == null || user.PasswordHash == null || user.PasswordSalt == null)
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
                throw new InvalidOperationException(AppText.Get("auth.samePassword"));
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
                Subject = AppText.Get("auth.passwordChangedSubject"),
                Body = emailBody
            });

            _logger.LogInformation("Password changed successfully for user {UserId}. All sessions revoked.", userId);

            return true;
        }
        private bool VerifyPasswordHash(string password, byte[]? passwordHash, byte[]? passwordSalt)
        {
            if (passwordHash == null || passwordSalt == null)
            {
                return false;
            }
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
              new Claim(ClaimTypes.Role, user.Role),
              new Claim("picture", user.ProfileImageUrl ?? "")
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

        // ---------- External (Google / Apple) sign-in ----------

        public async Task<LoginResponseDto> GoogleLoginAsync(GoogleLoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.IdToken))
            {
                throw new InvalidOperationException(AppText.Get("auth.invalidProviderToken"));
            }

            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings();
                var clientIds = _config.GetSection("GoogleAuth:ClientIds").Get<string[]>();
                if (clientIds != null && clientIds.Length > 0)
                {
                    settings.Audience = clientIds; // enforce that the token was minted for one of our apps
                }
                payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, settings);
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogWarning("Google token validation failed: {Message}", ex.Message);
                throw new InvalidOperationException(AppText.Get("auth.invalidProviderToken"));
            }

            var user = await FindOrCreateExternalUserAsync("Google", payload.Subject, payload.Email, payload.Name, payload.Picture);
            return await IssueTokensAsync(user);
        }

        public async Task<LoginResponseDto> AppleLoginAsync(AppleLoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.IdentityToken))
            {
                throw new InvalidOperationException(AppText.Get("auth.invalidProviderToken"));
            }

            JwtSecurityToken jwt;
            try
            {
                var clientIds = _config.GetSection("AppleAuth:ClientIds").Get<string[]>() ?? Array.Empty<string>();
                var signingKeys = await GetAppleSigningKeysAsync();

                var validationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = "https://appleid.apple.com",
                    ValidateAudience = clientIds.Length > 0,
                    ValidAudiences = clientIds,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKeys = signingKeys
                };

                var handler = new JwtSecurityTokenHandler();
                handler.ValidateToken(dto.IdentityToken, validationParameters, out var validated);
                jwt = (JwtSecurityToken)validated;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Apple token validation failed: {Message}", ex.Message);
                throw new InvalidOperationException(AppText.Get("auth.invalidProviderToken"));
            }

            // Optional nonce binding (expo-apple-authentication / web). Accept either raw or SHA256(raw) match.
            if (!string.IsNullOrEmpty(dto.Nonce))
            {
                var tokenNonce = jwt.Claims.FirstOrDefault(c => c.Type == "nonce")?.Value;
                var hashedNonce = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(dto.Nonce))).ToLowerInvariant();
                if (tokenNonce != hashedNonce && tokenNonce != dto.Nonce)
                {
                    throw new InvalidOperationException(AppText.Get("auth.invalidProviderToken"));
                }
            }

            var sub = jwt.Subject;
            var email = jwt.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
            var user = await FindOrCreateExternalUserAsync("Apple", sub, email, dto.FullName, null);
            return await IssueTokensAsync(user);
        }

        private async Task<IEnumerable<SecurityKey>> GetAppleSigningKeysAsync()
        {
            const string cacheKey = "apple_jwks_keys";
            if (_cache.TryGetValue(cacheKey, out IEnumerable<SecurityKey>? cached) && cached != null)
            {
                return cached;
            }

            var http = _httpClientFactory.CreateClient();
            var json = await http.GetStringAsync("https://appleid.apple.com/auth/keys");
            var jwks = new JsonWebKeySet(json);
            var keys = jwks.Keys.Cast<SecurityKey>().ToList();
            _cache.Set(cacheKey, (IEnumerable<SecurityKey>)keys, TimeSpan.FromHours(12));
            return keys;
        }

        private async Task<User> FindOrCreateExternalUserAsync(string provider, string providerKey, string? email, string? displayName, string? picture)
        {
            // 1) Already linked → sign in.
            User? user = provider == "Google"
                ? await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == providerKey)
                : await _context.Users.FirstOrDefaultAsync(u => u.AppleId == providerKey);

            // 2) Existing account with the same email → link this provider.
            if (user == null && !string.IsNullOrWhiteSpace(email))
            {
                var lowerEmail = email.ToLower();
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == lowerEmail);
                if (user != null)
                {
                    if (provider == "Google") user.GoogleId = providerKey; else user.AppleId = providerKey;
                    user.IsEmailVerified = true;
                    if (string.IsNullOrEmpty(user.ProfileImageUrl) && !string.IsNullOrEmpty(picture))
                    {
                        user.ProfileImageUrl = picture;
                    }
                    user.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            // 3) Brand new social user.
            if (user == null)
            {
                var lowerEmail = !string.IsNullOrWhiteSpace(email)
                    ? email.ToLower()
                    : $"{provider.ToLower()}_{providerKey}@users.gghub.social";

                string? firstName = null, lastName = null;
                if (!string.IsNullOrWhiteSpace(displayName))
                {
                    var parts = displayName.Trim().Split(' ', 2);
                    firstName = parts[0];
                    lastName = parts.Length > 1 ? parts[1] : null;
                }

                user = new User
                {
                    Email = lowerEmail,
                    Username = await GenerateUniqueUsernameAsync(displayName ?? email?.Split('@').FirstOrDefault()),
                    PasswordHash = null,
                    PasswordSalt = null,
                    IsEmailVerified = true,
                    FirstName = firstName,
                    LastName = lastName,
                    ProfileImageUrl = picture,
                    GoogleId = provider == "Google" ? providerKey : null,
                    AppleId = provider == "Apple" ? providerKey : null
                };

                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                await _gamificationService.AddXpAsync(user.Id, 50, "Welcome");
                await _gamificationService.CheckAchievementsAsync(user.Id, "Welcome");
            }

            if (user.IsBanned)
            {
                throw new InvalidOperationException(AppText.Get("auth.accountSuspended"));
            }

            return user;
        }

        private async Task<string> GenerateUniqueUsernameAsync(string? seed)
        {
            var baseName = new string((seed ?? "user").Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
            if (baseName.Length < 3) baseName = "user";
            if (baseName.Length > 15) baseName = baseName.Substring(0, 15);

            var candidate = baseName;
            var rng = new Random();
            for (int i = 0; i < 25; i++)
            {
                var exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == candidate);
                if (!exists) return candidate;
                candidate = $"{baseName}{rng.Next(1000, 99999)}";
            }
            // Guaranteed-unique fallback.
            return ($"{baseName}{Guid.NewGuid():N}").Substring(0, 20);
        }

        private async Task<LoginResponseDto> IssueTokensAsync(User user)
        {
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
    }
}
