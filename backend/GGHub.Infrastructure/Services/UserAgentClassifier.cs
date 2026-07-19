using System.Text.RegularExpressions;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// User-Agent'ı saklanabilir kovalara ayırır. Ham UA hiçbir zaman yazılmaz:
    /// IP + tam UA birleşimi parmak izidir; kovalar ise rapor için yeterli.
    /// Servisten ayrı tutuldu ki DB'ye dokunmadan test edilebilsin.
    /// </summary>
    public static class UserAgentClassifier
    {
        /// <summary>
        /// Bu sayfa Instagram/WhatsApp'ta paylaşılıyor ve link önizleme crawler'ları
        /// sürekli vuruyor. Ayıklanmazsa "sayfa görüntüleme" şişer ve ziyaret başı
        /// reklam maliyeti hesabı doğrudan bozulur.
        /// </summary>
        private static readonly Regex BotPattern = new(
            @"bot|crawl|spider|slurp|facebookexternalhit|WhatsApp|Twitterbot|TelegramBot|Discordbot|LinkedInBot|Slackbot|preview|headless|python-requests|curl|wget|Go-http-client|axios|monitoring|uptime",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static bool IsBot(string? userAgent) =>
            string.IsNullOrWhiteSpace(userAgent) || BotPattern.IsMatch(userAgent);

        public static string Platform(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent)) return "other";
            if (Regex.IsMatch(userAgent, @"iPhone|iPad|iPod", RegexOptions.IgnoreCase)) return "ios";
            if (userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase)) return "android";
            return "other";
        }

        public static string DeviceType(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent)) return "desktop";
            if (Regex.IsMatch(userAgent, @"iPad|Tablet", RegexOptions.IgnoreCase)) return "tablet";
            if (Regex.IsMatch(userAgent, @"Mobi|iPhone|Android", RegexOptions.IgnoreCase)) return "mobile";
            return "desktop";
        }

        /// <summary>
        /// Uygulama içi tarayıcılar ÖNCE kontrol edilir: hem Instagram hem Chrome
        /// dizgesini taşırlar ve asıl değerli bilgi hangi uygulamadan gelindiğidir.
        /// utm/fbclid hiç gelmese bile bu tek başına kanal atfı verir.
        /// </summary>
        public static string Browser(string? userAgent)
        {
            if (string.IsNullOrWhiteSpace(userAgent)) return "unknown";
            if (userAgent.Contains("Instagram", StringComparison.OrdinalIgnoreCase)) return "instagram";
            if (userAgent.Contains("FBAV", StringComparison.Ordinal) || userAgent.Contains("FBAN", StringComparison.Ordinal)) return "facebook";
            if (userAgent.Contains("TikTok", StringComparison.OrdinalIgnoreCase)) return "tiktok";
            if (userAgent.Contains("Twitter", StringComparison.OrdinalIgnoreCase)) return "twitter";
            if (userAgent.Contains("Edg/", StringComparison.Ordinal)) return "edge";
            if (userAgent.Contains("OPR/", StringComparison.Ordinal)) return "opera";
            if (userAgent.Contains("Firefox", StringComparison.OrdinalIgnoreCase)) return "firefox";
            if (userAgent.Contains("SamsungBrowser", StringComparison.OrdinalIgnoreCase)) return "samsung";
            if (userAgent.Contains("Chrome", StringComparison.OrdinalIgnoreCase)) return "chrome";
            // Safari en sonda: Chrome dahil pek çok UA "Safari" dizgesini taşır.
            if (userAgent.Contains("Safari", StringComparison.OrdinalIgnoreCase)) return "safari";
            return "other";
        }
    }
}
