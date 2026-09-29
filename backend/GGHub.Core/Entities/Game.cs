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

        /// <summary>
        /// Steam appid (varsa). Steam kaynakli oyunlarda RawgId = -SteamAppId (sentetik negatif id):
        /// wishlist/favori/review uclari sahadaki istemcilerden rawgId aldigi icin kolon nullable
        /// yapilamadi; negatif aralik RAWG'in pozitif id'leriyle CAKISAMAZ ve istemciler id'yi
        /// oldugu gibi geri gonderdigi icin akislarin hicbiri degismedi. RAWG ayni oyunu sonradan
        /// getirirse RawgId gercek pozitif id'ye cevrilir, SteamAppId baglanti olarak kalir.
        /// </summary>
        public int? SteamAppId { get; set; }

        /// <summary>
        /// IGDB oyun id'si (varsa). IGDB kaynakli satirlarda RawgId = -(1_000_000_000 + IgdbId).
        /// Neden 1 milyar offset: Steam satirlari -SteamAppId kullaniyor (en fazla ~10 milyon),
        /// bu aralik onlarla CAKISMAZ ve int sinirinin (2.1 milyar) altinda kalir.
        /// IGDB, Steam'in kapsamadigi konsol ozel yapimlarinin tek ucretsiz kaynagi.
        /// </summary>
        public int? IgdbId { get; set; }

        /// <summary>
        /// IGDB toplam puani (0-100). Kullanici + elestirmen ortalamasinin birlesimi.
        /// Metacritic/RAWG/GGHub uclusunun yaninda 4. kaynak olarak gosterilir; bir oyunda
        /// digerleri bos olsa bile burada puan bulunabiliyor.
        /// </summary>
        public double? IgdbRating { get; set; }

        /// <summary>IGDB puanini olusturan oy sayisi (guvenilirlik gostergesi).</summary>
        public int? IgdbRatingCount { get; set; }

        /// <summary>
        /// IGDB eslesmesi icin en son ne zaman arama yapildi. Eslesme BULUNAMASA da doldurulur;
        /// aksi halde IGDB'de karsiligi olmayan oyunlar her kosuda yeniden sorgulanip kuyrugu
        /// tikardi. Puanlar zamanla degistigi icin belirli araliklarla yeniden denenir.
        /// </summary>
        public DateTime? IgdbCheckedAt { get; set; }

        /// <summary>
        /// Guncel populerlik/trend skoru. Kesfet sayfasinin varsayilan sirasini besler.
        /// Onceki tasarimda siralama sabit kalite alanlarina + haftalik rotasyona dayaniyordu,
        /// yani liste HAFTALARCA ayni kaliyordu. Bu skor periyodik olarak yeniden hesaplanir:
        /// GGHub kullanici hareketi (inceleme, listeye/istek listesine ekleme) + Steam en cok
        /// satanlar/istek listesi sirasi + IGDB ilgi sinyalleri + yenilik.
        /// </summary>
        public double TrendScore { get; set; }

        public DateTime? TrendScoreUpdatedAt { get; set; }

        /// <summary>
        /// Oyunun GERCEK ilgi kaniti (0 = iz yok, ~100 = yilin en buyuk cikislari). Gundem
        /// vitrini ("One cikanlar") bununla siralanir.
        ///
        /// TrendScore'dan AYRI tutuluyor cunku TrendScore her yeni/yaklasan oyuna sabit bir
        /// yenilik primi (+90/+120) veriyor: kesfet icin dogru, ama sonucta katalogdaki HER
        /// guncel oyunun skoru sifirdan buyuk oluyor ve "bu oyun konusuluyor mu" sorusuna cevap
        /// veremiyor (olculdu: Eylul 2026 vitrini 6 rastgele indie oyundu, ayni ay cikan
        /// Marvel's Wolverine ve Control Resonant yoktu). Burada taban primi YOK: hicbir
        /// kaynakta izi olmayan oyunun skoru 0'dir. HypeScoreJob hesaplar.
        /// </summary>
        public double HypeScore { get; set; }

        public DateTime? HypeScoreUpdatedAt { get; set; }

        /// <summary>
        /// Eslesen Ingilizce Wikipedia makalesinin basligi. Bos ise oyunun makalesi yok:
        /// bu da bir bilgidir, cunku Wikipedia'da makalesi olan oyun tanimi geregi kayda degerdir.
        /// </summary>
        public string? WikipediaTitle { get; set; }

        /// <summary>
        /// Makalenin son 30 gundeki okunma sayisi. Platform bagimsiz tek hype olcusu: Steam
        /// yalnizca PC'yi, IGDB listeleri yalnizca ilk 500'u goruyor; okunma sayisi PS5 ozel
        /// yapimini da PC oyununu da ayni terazide tartiyor.
        /// </summary>
        public int? WikipediaViews30d { get; set; }

        public DateTime? WikipediaViewsUpdatedAt { get; set; }

        /// <summary>
        /// Gelecek tarihli bir cikisin IGDB'ye karsi en son ne zaman DOGRULANDIGI.
        /// release_dates ucundaki platform/surum satirlari ana oyunun tarihi sanilarak yazilinca
        /// eski oyunlar "gelecekte cikacak" gorunmustu (Elden Ring 2022 -> 2026). Bu alan hem
        /// onarim kuyrugunu kurutuyor hem de gercek ertelemeler icin periyodik yeniden kontrolu
        /// mumkun kiliyor.
        /// </summary>
        public DateTime? ReleaseDateVerifiedAt { get; set; }

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