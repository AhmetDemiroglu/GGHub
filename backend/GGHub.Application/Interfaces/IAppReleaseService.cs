using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Mobil surum/bakim politikasi: admin okur-yazar, mobil acilista EvaluateAsync ile karar alir.
    /// Okuma 60 sn onbellekli; admin guncellemesi onbellegi bosaltir.
    /// </summary>
    public interface IAppReleaseService
    {
        Task<AppReleasePolicyDto> GetPolicyAsync(CancellationToken ct = default);

        /// <exception cref="ArgumentException">Gecersiz surum bicimi, min > onerilen, gecersiz magaza adresi.</exception>
        Task<AppReleasePolicyDto> UpdatePolicyAsync(AppReleasePolicyDto dto, CancellationToken ct = default);

        /// <param name="platform">"ios" | "android"</param>
        /// <param name="version">Uygulamanin kendi surumu, ornek "1.3.0"</param>
        Task<AppReleaseCheckDto> EvaluateAsync(string platform, string version, CancellationToken ct = default);
    }
}
