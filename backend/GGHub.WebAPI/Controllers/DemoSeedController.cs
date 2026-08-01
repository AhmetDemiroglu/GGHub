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

        [HttpDelete("demo")]
        public async Task<IActionResult> Purge(CancellationToken cancellationToken)
        {
            if (!IsEnabled)
                return BadRequest(new { message = "Seed:DemoEnabled is false." });

            var removed = await _seeder.PurgeAsync(cancellationToken);
            return Ok(new { usersRemoved = removed });
        }
    }
}
