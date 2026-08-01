using GGHub.Infrastructure.Persistence.Seeders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GGHub.WebAPI.Controllers
{
    /// <summary>
    /// Demo icerik yonetimi. IKI kapi birden gecilmek zorunda:
    ///   1. Admin rolu ([Authorize(Policy = "Admin")])
    ///   2. Seed:DemoEnabled = true yapilandirmasi
    ///
    /// Ikinci kapinin sebebi: gelistirme ortamindaki baglanti dizesi CANLI
    /// veritabanini gosteriyor. Yalnizca rol kapisi olsaydi, admin hesabiyla
    /// giris yapmis biri yanlislikla uretime 500 sahte gonderi yazabilirdi.
    /// Bayrak, "bunu gercekten istiyorum" adimini acikca zorunlu kiliyor.
    /// </summary>
    [ApiController]
    [Route("api/admin/seed")]
    [Authorize(Policy = "Admin")]
    public class DemoSeedController : ControllerBase
    {
        private readonly DemoContentSeeder _seeder;
        private readonly IConfiguration _configuration;

        public DemoSeedController(DemoContentSeeder seeder, IConfiguration configuration)
        {
            _seeder = seeder;
            _configuration = configuration;
        }

        private bool IsEnabled => _configuration.GetValue<bool>("Seed:DemoEnabled");

        [HttpPost("demo")]
        public async Task<IActionResult> Seed(CancellationToken cancellationToken)
        {
            if (!IsEnabled)
                return BadRequest(new { message = "Seed:DemoEnabled is false." });

            var created = await _seeder.SeedAsync(cancellationToken);
            return Ok(new { postsCreated = created });
        }

        /// <summary>
        /// Demo icerigi siler.
        ///
        /// Varsayilan kapsam: yalnizca bu seeder'in urettikleri (IsSeeded=true).
        ///
        /// ?includeLegacy=true : IsSeeded bayragi OLMAYAN eski sahte hesaplar
        /// (@fake.gghub.social) ve onlarin TUM icerigi de silinir; inceleme,
        /// liste, yorum, oy, mesaj, takip bagi dahil. Platformu tamamen gercek
        /// veriye dondurmek icin bu kullanilir. Geri alinamaz.
        /// </summary>
        [HttpDelete("demo")]
        public async Task<IActionResult> Purge(
            [FromQuery] bool includeLegacy = false,
            CancellationToken cancellationToken = default)
        {
            if (!IsEnabled)
                return BadRequest(new { message = "Seed:DemoEnabled is false." });

            var removed = await _seeder.PurgeAsync(includeLegacy, cancellationToken);
            return Ok(new { usersRemoved = removed, includeLegacy });
        }
    }
}
