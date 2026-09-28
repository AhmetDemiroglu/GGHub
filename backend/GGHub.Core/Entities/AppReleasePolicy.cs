namespace GGHub.Core.Entities
{
    /// <summary>
    /// Mobil uygulama surum ve bakim politikasi. Admin panelinden yonetilir, TEK satir (Id = 1),
    /// yoksa AppReleaseService varsayilanlarla olusturur.
    ///
    /// Surumler "1.3.0" bicimindedir. Bos/null alan "kisit yok" demektir.
    ///   - MinVersion: bunun ALTINDAKI uygulama acilmaz (zorunlu guncelleme ekrani).
    ///   - RecommendedVersion: bunun altindaki uygulama "yeni surum var" penceresi gorur, devam edebilir.
    ///   - MaintenanceEnabled: surumden bagimsiz, tum mobil uygulama bakim ekranina duser. Web etkilenmez.
    /// </summary>
    public class AppReleasePolicy
    {
        public int Id { get; set; } = 1;

        public bool MaintenanceEnabled { get; set; }

        /// <summary>Bakim ekraninda gosterilecek ozel mesaj (bos ise uygulama kendi metnini kullanir).</summary>
        public string? MaintenanceMessageTr { get; set; }
        public string? MaintenanceMessageEn { get; set; }

        public string? IosMinVersion { get; set; }
        public string? IosRecommendedVersion { get; set; }
        public string? AndroidMinVersion { get; set; }
        public string? AndroidRecommendedVersion { get; set; }

        public string IosStoreUrl { get; set; } = "https://apps.apple.com/us/app/gghub-games-community/id6781281375";
        public string AndroidStoreUrl { get; set; } = "https://play.google.com/store/apps/details?id=com.gghub.mobile";

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
