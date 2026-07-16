namespace GGHub.Core.Entities
{
    public class Game
    {
        public int Id { get; set; }
        public int RawgId { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Released { get; set; }
        public string? BackgroundImage { get; set; }
        public double? Rating { get; set; }
        public int? Metacritic { get; set; }
        public string? Description { get; set; }
        public string? CoverImage { get; set; }
        public DateTime LastSyncedAt { get; set; }
        public string? PlatformsJson { get; set; }
        public string? GenresJson { get; set; }
        public string? DevelopersJson { get; set; } 
        public string? PublishersJson { get; set; }
        public string? StoresJson { get; set; }    
        public string? WebsiteUrl { get; set; }   
        public string? EsrbRating { get; set; }
        public double AverageRating { get; set; } = 0;
        public int RatingCount { get; set; } = 0;
        public string? DescriptionTr { get; set; }
        public string? MetacriticUrl { get; set; }

        // RAWG Import tracking
        public string? ImportSource { get; set; }
        public DateTime? ImportedAt { get; set; }
        public int? RawgRatingsCount { get; set; }
        public int? RawgAdded { get; set; }

        /// <summary>
        /// RAWG detay ucundan (games/{id}) bu oyun icin YETKILI bir yanit aldigimiz an.
        /// GameDetailBackfillJob'in kuyrugu bu kolonun null olmasi; islenen oyun bir daha denenmiyor.
        /// Aciklamasi olmayan oyun da isaretlenir, yoksa sonsuza dek yeniden denenirdi.
        /// 200 ve 404 doldurur; 429/5xx/timeout DOLDURMAZ (o oyun tekrar denenmeli).
        ///
        /// LastSyncedAt'ten AYRI tutuluyor: LastSyncedAt'i MetacriticSyncJob cooldown ve siralama
        /// icin kullaniyor (MetacriticSyncJob.cs:110-116). Backfill 31 bin satira LastSyncedAt=now
        /// yazsaydi butun metacritic kuyrugu bozulurdu.
        /// </summary>
        public DateTime? DetailSyncedAt { get; set; }
    }
}