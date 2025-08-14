namespace GGHub.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toAddress, string subject, string body);
    }
}