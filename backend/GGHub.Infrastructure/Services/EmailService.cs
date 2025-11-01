using GGHub.Application.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using MimeKit.Text;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;

namespace GGHub.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        public EmailService(IConfiguration config) { _config = config; }

        public async Task SendEmailAsync(string toAddress, string subject, string body)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(_config["EmailSettings:FromName"], _config["EmailSettings:FromAddress"]));
            email.To.Add(MailboxAddress.Parse(toAddress));
            email.Subject = subject;
            email.Body = new TextPart(TextFormat.Html) { Text = body };

            using var smtp = new SmtpClient();
            //smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

            //await smtp.ConnectAsync(_config["EmailSettings:Host"], int.Parse(_config["EmailSettings:Port"]!), SecureSocketOptions.StartTls);

            var port = int.Parse(_config["EmailSettings:Port"]!);
            var secureOption = SecureSocketOptions.StartTls;

            if (port == 465)
            {
                secureOption = SecureSocketOptions.SslOnConnect; 
            }
            else if (port == 587)
            {
                secureOption = SecureSocketOptions.StartTls; 
            }

            await smtp.ConnectAsync(_config["EmailSettings:Host"], port, secureOption); 

            await smtp.AuthenticateAsync(_config["EmailSettings:FromAddress"], _config["EmailSettings:AppPassword"]);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
    }
}