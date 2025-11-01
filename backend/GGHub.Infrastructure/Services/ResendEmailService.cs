using GGHub.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Resend;

namespace GGHub.Infrastructure.Services
{
    public class ResendEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<ResendEmailService> _logger;
        private readonly IResend _resend;

        public ResendEmailService(IConfiguration config, ILogger<ResendEmailService> logger, IResend resend)
        {
            _config = config;
            _logger = logger;
            _resend = resend;
        }

        public async Task SendEmailAsync(string toAddress, string subject, string body)
        {
            try
            {
                _logger.LogInformation("Sending email via Resend to {ToAddress}", toAddress);

                var message = new EmailMessage
                {
                    From = $"{_config["ResendSettings:FromName"]} <{_config["ResendSettings:FromAddress"]}>",
                    To = new[] { toAddress },
                    Subject = subject,
                    HtmlBody = body
                };

                var response = await _resend.EmailSendAsync(message);

                _logger.LogInformation("Email sent successfully via Resend to {ToAddress}", toAddress);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Resend API error while sending to {ToAddress}: {Message}",
                    toAddress, ex.Message);
                throw;
            }
        }
    }
}