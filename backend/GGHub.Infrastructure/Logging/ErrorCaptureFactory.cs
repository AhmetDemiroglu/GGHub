using GGHub.Core.Utilities;
using System.Security.Cryptography;
using System.Text;
using GGHub.Core.Enums;

namespace GGHub.Infrastructure.Logging
{
    /// <summary>
    /// Exception'dan ve ham istek bilgisinden kayit alanlarini uretir: kisaltma, ic zincir,
    /// gruplama satiri, query string maskesi ve parmak izi. Saf fonksiyonlar, DB ya da
    /// HttpContext bilmez.
    /// </summary>
    public static class ErrorCaptureFactory
    {
        public const int MaxMessage = 2000;
        public const int MaxStack = 16000;

        /// <summary>Yakalanan exception bu anahtarla isaretlenir; ikinci yakalayici onu atlar.</summary>
        public const string CapturedKey = "gghub.captured";

        private static readonly string[] SensitiveKeys =
        {
            "token", "access_token", "refresh_token", "id_token", "code", "password", "key", "secret", "signature"
        };

        /// <summary>Exception ya da ic zincirinden biri daha once kaydedildiyse true.</summary>
        public static bool IsCaptured(Exception exception)
        {
            for (var e = exception; e is not null; e = e.InnerException)
            {
                if (e.Data.Contains(CapturedKey)) return true;
            }
            return false;
        }

        public static void MarkCaptured(Exception exception)
        {
            for (var e = exception; e is not null; e = e.InnerException)
            {
                try { e.Data[CapturedKey] = true; }
                catch { /* Data salt okunur olabilir; isaretlenemezse yalnizca cift kayit riski var. */ }
            }
        }

        public static string Truncate(string? value, int max)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            return SafeText.Truncate(value, max);
        }

        public static string? InnerChain(Exception exception)
        {
            if (exception.InnerException is null) return null;

            var builder = new StringBuilder();
            var depth = 0;
            for (var e = exception.InnerException; e is not null && depth < 8; e = e.InnerException, depth++)
            {
                builder.Append(e.GetType().FullName).Append(": ").AppendLine(e.Message);
            }
            return Truncate(builder.ToString().TrimEnd(), MaxMessage);
        }

        /// <summary>
        /// Tam stack: en ICTEKI exception'in stack'i basta (asil patlayan yer orasi), ardindan
        /// dis exception'inki. ToString() bunu zaten veriyor ama mesajlari da tekrar eder.
        /// </summary>
        public static string? FullStack(Exception exception)
        {
            var text = exception.ToString();
            return string.IsNullOrWhiteSpace(text) ? null : Truncate(text, MaxStack);
        }

        /// <summary>Ilk "at GGHub." satiri; yoksa stack'in ilk satiri. Satir numarasi gruplamaya girer.</summary>
        public static string? TopFrame(Exception exception)
        {
            string? first = null;
            for (var e = exception; e is not null; e = e.InnerException)
            {
                if (string.IsNullOrEmpty(e.StackTrace)) continue;
                foreach (var raw in e.StackTrace.Split('\n'))
                {
                    var line = raw.Trim();
                    if (line.Length == 0) continue;
                    first ??= line;
                    if (line.Contains("GGHub.", StringComparison.Ordinal)) return Truncate(line, 300);
                }
            }
            return first is null ? null : Truncate(first, 300);
        }

        /// <summary>"?token=abc&amp;page=2" -> "?token=***&amp;page=2". Deger uzunlugu da sinirlanir.</summary>
        public static string? MaskQueryString(string? queryString)
        {
            if (string.IsNullOrEmpty(queryString) || queryString == "?") return null;

            var parts = queryString.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
            for (var i = 0; i < parts.Length; i++)
            {
                var separator = parts[i].IndexOf('=');
                if (separator <= 0) continue;

                var key = parts[i][..separator];
                var sensitive = SensitiveKeys.Any(s => key.Contains(s, StringComparison.OrdinalIgnoreCase));
                if (sensitive)
                {
                    parts[i] = key + "=***";
                }
            }
            return Truncate("?" + string.Join('&', parts), 1024);
        }

        public static string Fingerprint(ErrorSource source, string exceptionType, string? topFrame, string? logger, string? method, string? routeTemplate)
        {
            // Stack satiri yoksa (exception'siz LogError, ciplak 5xx) logu yazan sinif ayirt eder.
            var raw = string.Join('|', (int)source, exceptionType, topFrame ?? logger ?? string.Empty, method ?? string.Empty, routeTemplate ?? string.Empty);
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(hash)[..40].ToLowerInvariant();
        }
    }
}
