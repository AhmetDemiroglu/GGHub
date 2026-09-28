using System.Collections.Concurrent;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// Model basina dakikalik istek sinirlayicisi (surec ici, singleton). Gemma'nin ucretsiz
    /// kullanimi dakikada ~15 istekle sinirli; 429 yiyip kotayi yakmak yerine burada sirayla bekleriz.
    /// Ayrica 429 alinan model icin bir "soguma" suresi tutar: o sure bitene kadar cagiran dogrudan
    /// yedek modele gecer.
    /// </summary>
    public sealed class GeminiRateLimiter
    {
        private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, Queue<DateTime>> _windows = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, DateTime> _cooldownUntil = new(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Dakikadaki istek sayisi <paramref name="rpm"/>'in altina inene kadar bekler. En fazla
        /// <paramref name="maxWait"/> bekler; asarsa false doner (cagiran yedege gecebilir).
        /// </summary>
        public async Task<bool> WaitForSlotAsync(string model, int rpm, TimeSpan maxWait, CancellationToken cancellationToken)
        {
            if (rpm <= 0) return true;

            var gate = _locks.GetOrAdd(model, _ => new SemaphoreSlim(1, 1));
            var window = _windows.GetOrAdd(model, _ => new Queue<DateTime>());
            var deadline = DateTime.UtcNow + maxWait;

            await gate.WaitAsync(cancellationToken);
            try
            {
                while (true)
                {
                    var now = DateTime.UtcNow;
                    while (window.Count > 0 && now - window.Peek() >= TimeSpan.FromMinutes(1))
                    {
                        window.Dequeue();
                    }

                    if (window.Count < rpm)
                    {
                        window.Enqueue(now);
                        return true;
                    }

                    var wait = window.Peek().AddMinutes(1) - now + TimeSpan.FromMilliseconds(50);
                    if (now + wait > deadline)
                    {
                        return false;
                    }

                    await Task.Delay(wait, cancellationToken);
                }
            }
            finally
            {
                gate.Release();
            }
        }

        public void StartCooldown(string model, TimeSpan duration)
            => _cooldownUntil[model] = DateTime.UtcNow + duration;

        public bool IsCoolingDown(string model)
            => _cooldownUntil.TryGetValue(model, out var until) && until > DateTime.UtcNow;
    }
}
