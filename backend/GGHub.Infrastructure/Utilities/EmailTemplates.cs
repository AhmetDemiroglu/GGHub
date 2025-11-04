namespace GGHub.Infrastructure.Utilities
{
    public static class EmailTemplates
    {
        private const string LogoUrl = "https://assets.gghub.social/profiles/EmailLogo.png";

        private const string BrandStart = "#00E5FF";
        private const string BrandEnd = "#7C4DFF";

        private static string GetBaseTemplate(string content)
        {
            return $@"
            <!DOCTYPE html>
            <html lang='tr'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>GGHub</title>
            </head>
            <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, ""Helvetica Neue"", Arial, sans-serif; background-color: #f4f4f5;'>
                <table role='presentation' style='width: 100%; border-collapse: collapse;'>
                    <tr>
                        <td align='center' style='padding: 40px 0;'>
                            <table role='presentation' style='width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'>
                    
                                <!-- Header -->
                                <tr>
                                  <td
                                    style=""
                                      padding: 18px 40px 16px 40px;
                                      text-align: center;
                                      background: linear-gradient(135deg, #061423 0%, #0B0F1B 45%, #1A1440 100%);
                                      border-radius: 8px 8px 0 0;
                                    ""
                                  >
                                    <img
                                      src=""https://assets.gghub.social/profiles/EmailLogo.png""
                                      alt=""GGHub""
                                      width=""88""
                                      height=""88""
                                      style=""display:block;margin:0 auto 8px;border:0;outline:none;""
                                    />
                                    <h1 style=""margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:.2px;"">GGHub</h1>
                                    <div style=""margin-top:6px;color:rgba(255,255,255,.9);font-size:14px;font-weight:300;font-style:italic;letter-spacing:.15px;"">
                                      Türkiye'nin oyuncu sosyal platformu.
                                    </div>
                                  </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style='padding: 40px;'>
                                        {content}
                                    </td>
                                </tr>
                    
                                <!-- Footer -->
                                <tr>
                                    <td style='padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;'>
                                        <p style='margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-align: center;'>
                                            Bu e-posta <strong>GGHub</strong> tarafından gönderilmiştir.
                                        </p>
                                        <p style='margin: 0; color: #9ca3af; font-size: 12px; text-align: center;'>
                                            © 2025 GGHub. Tüm hakları saklıdır.
                                        </p>
                                        <p style='margin: 16px 0 0; text-align:center;'>
                                            <a href='https://gghub.social' style='color: {BrandEnd}; text-decoration: none; font-size: 13px;'>Ana Sayfa</a>
                                            <span style='color: #d1d5db; margin: 0 10px;'>|</span>
                                            <a href='https://gghub.social/about' style='color: {BrandEnd}; text-decoration: none; font-size: 13px;'>Hakkımızda</a>
                                            <span style='color: #d1d5db; margin: 0 10px;'>|</span>
                                            <a href='https://gghub.social/terms' style='color: {BrandEnd}; text-decoration: none; font-size: 13px;'>Kullanım Şartları</a>
                                        </p>
                                    </td>
                                </tr>

                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>";
        }
                

        public static string GetEmailVerificationTemplate(string username, string verificationLink)
        {
            var content = $@"
                <h2 style='margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;'>
                    Merhaba {username}! 👋
                </h2>
                <p style='margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                    GGHub'a hoş geldin! Hesabını aktif etmek için aşağıdaki butona tıklaman yeterli.
                </p>
                <div style='text-align: center; margin: 30px 0;'>
                  <a href='{verificationLink}'
                     style='
                       display:inline-block;
                       padding:14px 32px;
                       background: linear-gradient(135deg, #061423 0%, #0B0F1B 45%, #1A1440 100%);
                       color:#ffffff;
                       text-decoration:none;
                       border-radius:10px;
                       font-weight:700;
                       font-size:16px;
                       border:1px solid rgba(255,255,255,0.08);
                       box-shadow:0 2px 10px rgba(0,0,0,0.25);
                     '>
                    Hesabımı Doğrula
                  </a>
                </div>

                <p style='margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;'>
                    Eğer bu linke tıklayamıyorsan, aşağıdaki bağlantıyı tarayıcına kopyala-yapıştır yapabilirsin:
                </p>
                <p style='margin: 10px 0 0 0; color: #9ca3af; font-size: 12px; word-break: break-all;'>
                    {verificationLink}
                </p>
                <div style='margin-top: 30px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;'>
                    <p style='margin: 0; color: #92400e; font-size: 13px;'>
                        ⚠️ Bu işlemi sen yapmadıysan, bu e-postayı görmezden gelebilirsin.
                    </p>
                </div>";

            return GetBaseTemplate(content);
        }

        public static string GetPasswordResetTemplate(string username, string resetCode)
        {
            var content = $@"
                <h2 style='margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;'>
                    Şifre Sıfırlama Talebi
                </h2>
                <p style='margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                    Merhaba {username},
                </p>
                <p style='margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                    Hesabın için şifre sıfırlama talebinde bulundun. Aşağıdaki 6 haneli kodu kullanarak şifreni sıfırlayabilirsin.
                </p>
                <div style='text-align: center; margin: 30px 0;'>
                    <div style='display: inline-block; padding: 20px 40px; background-color: #f3f4f6; border: 2px dashed {BrandEnd}; border-radius: 8px;'>
                        <span style='font-size: 32px; font-weight: 700; letter-spacing: 8px; color: {BrandEnd}; font-family: ""Courier New"", monospace;'>
                            {resetCode}
                        </span>
                    </div>
                </div>
                <p style='margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;'>
                    Bu kod <strong>15 dakika</strong> geçerlidir.
                </p>
                <div style='margin-top: 30px; padding: 16px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;'>
                    <p style='margin: 0; color: #7f1d1d; font-size: 13px;'>
                        🔒 Bu işlemi sen yapmadıysan, hesabının güvenliği tehlikede olabilir. Hemen şifreni değiştir.
                    </p>
                </div>";

            return GetBaseTemplate(content);
        }

        public static string GetPasswordChangedNotification(string username)
        {
            var content = $@"
                <h2 style='margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 600;'>
                    Şifre Değişikliği Bildirimi
                </h2>
                <p style='margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                    Merhaba {username},
                </p>
                <p style='margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;'>
                    GGHub hesabının şifresi başarıyla değiştirildi.
                </p>
                <div style='margin: 30px 0; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;'>
                    <p style='margin: 0; color: #065f46; font-size: 14px;'>
                        ✓ Şifre değişikliği: <strong>{DateTime.UtcNow.ToString("dd.MM.yyyy HH:mm")} (UTC)</strong>
                    </p>
                </div>
                <div style='margin-top: 30px; padding: 16px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;'>
                    <p style='margin: 0 0 10px 0; color: #7f1d1d; font-size: 14px; font-weight: 600;'>
                        🚨 Bu işlemi sen yapmadıysan:
                    </p>
                    <ul style='margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 13px;'>
                        <li>Hesabının güvenliği tehlikede olabilir</li>
                        <li>Hemen şifreni değiştir</li>
                        <li>Bizimle iletişime geç: support@gghub.social</li>
                    </ul>
                </div>
                <p style='margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;'>
                    Hesabının güvenliği için şifreni düzenli olarak değiştirmeyi unutma.
                </p>";

            return GetBaseTemplate(content);
        }
    }
}
