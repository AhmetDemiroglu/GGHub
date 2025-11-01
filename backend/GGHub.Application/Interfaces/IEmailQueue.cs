using System.Threading;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public class EmailJob
    {
        public string ToAddress { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
    }
    public interface IEmailQueue
    {
        void EnqueueEmail(EmailJob emailJob);
        Task<EmailJob> DequeueEmailAsync(CancellationToken cancellationToken);
    }
}