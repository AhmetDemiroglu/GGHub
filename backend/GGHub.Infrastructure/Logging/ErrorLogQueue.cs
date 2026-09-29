using System.Threading.Channels;
using Microsoft.Extensions.Options;

namespace GGHub.Infrastructure.Logging
{
    /// <summary>
    /// Yakalayicilar (middleware, Serilog sink) ile yazici (ErrorLogWriter) arasindaki kuyruk.
    /// Hata kaydi istegi ASLA yavaslatmaz ve ASLA yeni bir hata uretmez: TryWrite bloklamaz,
    /// kuyruk doluysa olay sessizce dusurulur (hata firtinasinda DB'yi de bogmayiz).
    /// </summary>
    public class ErrorLogQueue
    {
        private readonly Channel<ErrorCapture> _channel;

        public ErrorLogQueue(IOptions<ErrorLogOptions> options)
        {
            Enabled = options.Value.Enabled ?? false;
            _channel = Channel.CreateBounded<ErrorCapture>(new BoundedChannelOptions(Math.Max(10, options.Value.QueueCapacity))
            {
                FullMode = BoundedChannelFullMode.DropWrite,
                SingleReader = true
            });
        }

        public bool Enabled { get; }

        public ChannelReader<ErrorCapture> Reader => _channel.Reader;

        public void Enqueue(ErrorCapture capture)
        {
            if (!Enabled) return;
            _channel.Writer.TryWrite(capture);
        }
    }
}
