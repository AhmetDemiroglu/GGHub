using GGHub.Application.Interfaces;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;

namespace GGHub.Infrastructure.Services
{
    public class EmailQueue : IEmailQueue
    {
        private readonly BlockingCollection<EmailJob> _queue = new BlockingCollection<EmailJob>(new ConcurrentQueue<EmailJob>());
        public void EnqueueEmail(EmailJob emailJob)
        {
            _queue.Add(emailJob);
        }
        public Task<EmailJob> DequeueEmailAsync(CancellationToken cancellationToken)
        {
            var emailJob = _queue.Take(cancellationToken);
            return Task.FromResult(emailJob);
        }
    }
}