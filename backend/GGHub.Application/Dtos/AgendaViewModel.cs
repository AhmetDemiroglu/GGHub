namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Oyun Gundemi: secilen ayin cikmis + cikacak oyunlari. DB-only beslenir
    /// (RAWG coktugunde de calisir); tazeligi Worker'daki sync joblari saglar.
    /// </summary>
    public class AgendaViewModel
    {
        public int Year { get; set; }
        public int Month { get; set; }

        /// <summary>Ay icinde cikmis oyunlar (bugun dahil), tarih azalan.</summary>
        public List<GameDto> Released { get; set; } = new();

        /// <summary>Ay icinde cikacak oyunlar, tarih artan.</summary>
        public List<GameDto> Upcoming { get; set; } = new();

        public AgendaCountsDto Counts { get; set; } = new();
    }

    public class AgendaCountsDto
    {
        public int Released { get; set; }
        public int Upcoming { get; set; }
    }
}
