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

        /// <summary>
        /// Vitrin icin POPULERLIGE gore secilmis oyunlar (tarih sirasina gore DEGIL).
        /// Tarih sirasi vitrini rastgele indie oyunlarla dolduruyordu; kullanici buyuk
        /// cikislari gormek istiyor.
        /// </summary>
        public List<GameDto> Highlights { get; set; } = new();

        /// <summary>
        /// Cikis tarihi henuz aciklanmamis ama beklenen buyuk oyunlar (Released = null).
        /// Yalnizca yil gorunumunde (month=0) doldurulur; aksi halde hicbir aya dusemedikleri
        /// icin katalogda olmalarina ragmen gundemde hic gorunmuyorlardi.
        /// </summary>
        public List<GameDto> Tba { get; set; } = new();

        public AgendaCountsDto Counts { get; set; } = new();
    }

    public class AgendaCountsDto
    {
        public int Released { get; set; }
        public int Upcoming { get; set; }
    }
}
