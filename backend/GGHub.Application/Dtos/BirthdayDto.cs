namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Kutlama sayfasinin verisi. YALNIZCA istegi yapan kullanicinin kendisine dair;
    /// endpoint URL'inde ve govdesinde kullanici kimligi tasimaz.
    ///
    /// Yas BILEREK yok: dogum yili hicbir yanitta gorunmez.
    /// </summary>
    public class BirthdayDto
    {
        /// <summary>Ad + soyad (trim), ikisi de bossa kullanici adi.</summary>
        public string DisplayName { get; set; } = string.Empty;

        public string Username { get; set; } = string.Empty;

        public string? ProfileImageUrl { get; set; }

        /// <summary>
        /// EN SON gerceklesen dogum gunu, Istanbul yerel takvimi ("yyyy-MM-dd").
        /// 18 Temmuz dogumlu biri 18 Tem 2026 ile 17 Tem 2027 arasinda "2026-07-18",
        /// 18 Tem 2027'de "2027-07-18" gorur.
        /// </summary>
        public DateOnly CelebrationDate { get; set; }

        /// <summary>CelebrationDate bugun mu. Sayfa buna gore kutlama tonuna gecer.</summary>
        public bool IsToday { get; set; }
    }
}
