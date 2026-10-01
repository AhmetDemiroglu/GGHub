using GGHub.Core.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class RefreshToken
    {
        public int Id { get; set; }
        public string Token { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RevokedAt { get; set; }

        /// <summary>
        /// Yenileme ile iptal edildiyse yerine verilen token. Bos ise token baska sebeple iptal
        /// edildi (sifre degisikligi, hesap silme) ve hicbir kosulda kurtarilamaz.
        /// Kayip yanit kurtarmasi icin: bkz. AuthService.RefreshTokenAsync.
        /// </summary>
        public string? ReplacedByToken { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public NotificationType Type { get; set; }
    }
}