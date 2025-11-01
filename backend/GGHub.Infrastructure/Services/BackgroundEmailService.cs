using GGHub.Application.Interfaces;
using Microsoft.Extensions.Hosting; 
using Microsoft.Extensions.Logging; 
using Microsoft.Extensions.DependencyInjection;

namespace GGHub.Infrastructure.Services
{
    public class BackgroundEmailService : BackgroundService 
    {
        private readonly ILogger<BackgroundEmailService> _logger;
        private readonly IEmailQueue _emailQueue;
        private readonly IServiceProvider _serviceProvider;
        public BackgroundEmailService(
            ILogger<BackgroundEmailService> logger,
            IEmailQueue emailQueue,
            IServiceProvider serviceProvider)           
        {
            _logger = logger;
            _emailQueue = emailQueue;
            _serviceProvider = serviceProvider;
        }
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("BackgroundEmailService is starting.");

            await Task.Yield();

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    EmailJob emailJob = await _emailQueue.DequeueEmailAsync(stoppingToken);
                    _logger.LogInformation("Attempting to send email to {ToAddress}", emailJob.ToAddress);

                    using (IServiceScope scope = _serviceProvider.CreateScope())
                    {
                        IEmailService scopedEmailService =
                            scope.ServiceProvider.GetRequiredService<IEmailService>();

                        await scopedEmailService.SendEmailAsync(
                            emailJob.ToAddress,
                            emailJob.Subject,
                            emailJob.Body
                        );
                    }
                    _logger.LogInformation("Successfully sent email to {ToAddress}", emailJob.ToAddress);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogWarning("BackgroundEmailService is stopping (OperationCanceled).");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send email. Error: {ErrorMessage}", ex.Message);
                }
            }

            _logger.LogInformation("BackgroundEmailService is stopping.");
        }
    }
}