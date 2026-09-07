namespace GGHub.Application.Dtos
{
    public class DashboardStatsDto
    {
        public int TotalUsers { get; set; }
        public int BannedUsers { get; set; }
        public int PendingReports { get; set; }
        public int TotalLists { get; set; }
        public int TotalReviews { get; set; }

        /// <summary>
        /// Demo/seed hesaplar (User.IsSeeded). TotalUsers ve TotalReviews bunlari ICERMEZ; gercek
        /// buyumeyi olcerken sahte hesaplarin sayiya karismasi yaniltiyordu. Ayri alan olarak
        /// dondurulur ki web istenirse "sahte hesaplar dahil" toplamini da gosterebilsin. Eski
        /// istemciler (mobil) yalnizca gercek sayilari gorur, ek alanlar gormezden gelinir.
        /// </summary>
        public int SeededUsers { get; set; }
        public int SeededReviews { get; set; }
    }
}