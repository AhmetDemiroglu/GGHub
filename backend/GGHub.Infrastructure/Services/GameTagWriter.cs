using GGHub.Core.Utilities;
using GGHub.Core.Entities;
using GGHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace GGHub.Infrastructure.Services
{
    /// <summary>
    /// GameTags tablosuna yazan TEK yer. Uc kaynak (RAWG, IGDB, Steam) ayri ayri etiket
    /// veriyor; hepsi buradan gecer ki slug uretimi, gurultu eleme ve "ayni slug tek satir"
    /// kurali tek yerde dursun.
    /// </summary>
    public static class GameTagWriter
    {
        public const string SourceRawg = "rawg";
        public const string SourceIgdb = "igdb";
        public const string SourceSteam = "steam";

        /// <summary>
        /// Magaza mekanigi ve dagitim etiketleri: iki oyunun "Steam Achievements" paylasmasi
        /// benzerlik anlatmaz, yalnizca aday havuzunu sisirir. IDF bunlari zaten zayiflatir
        /// ama "exclusive" gibi orta yayginliktakiler sahte eslesme uretiyordu.
        /// </summary>
        private static readonly HashSet<string> Noise = new(StringComparer.Ordinal)
        {
            "steam-achievements", "steam-cloud", "steam-trading-cards", "steam-workshop",
            "steam-leaderboards", "steam-turn-notifications", "steam-timeline", "stats",
            "full-controller-support", "partial-controller-support", "captions-available",
            "includes-level-editor", "commentary-available", "in-app-purchases",
            "remote-play-on-tv", "remote-play-together", "remote-play-on-phone",
            "remote-play-on-tablet", "family-sharing", "cross-platform-multiplayer",
            "downloadable-content", "exclusive", "true-exclusive", "steam", "epic-games",
            "gog", "playstation", "xbox", "nintendo", "mods", "moddable", "hdr-available",
            "valve-anti-cheat-enabled", "includes-source-sdk", "lan-co-op", "lan-pvp",
            "shared-split-screen", "shared-split-screen-co-op", "shared-split-screen-pvp",
            "tracked-controller-support", "vr-supported", "vr-only", "vr-support",
            "steamvr-collectibles", "online-co-op", "online-pvp", "steam-china-workshop",
            "digital-distribution", "achievements", "steam-play", "playstation-network",
            "xbox-live", "psn", "nintendo-switch-online",
        };

        /// <summary>Ad -> slug: kucuk harf, ASCII harf/rakam disi her sey tire ("Open World" -> "open-world").</summary>
        public static string Slugify(string value)
        {
            var sb = new StringBuilder(value.Length);
            var lastWasDash = true;
            foreach (var ch in value.ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(ch) && ch < 128)
                {
                    sb.Append(ch);
                    lastWasDash = false;
                }
                else if (!lastWasDash)
                {
                    sb.Append('-');
                    lastWasDash = true;
                }
            }
            return sb.ToString().TrimEnd('-');
        }

        /// <summary>
        /// (slug, name) ciftlerini temizler: bos, gurultu ve tekrarlar dusurulur, slug
        /// verilmemisse addan uretilir. Kaynak DTO'larindan cikan listeyi buraya vermek yeter.
        /// </summary>
        public static List<(string Slug, string Name)> Clean(IEnumerable<(string? Slug, string? Name)> raw, int max = 40)
        {
            var result = new List<(string, string)>();
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var (rawSlug, rawName) in raw)
            {
                var name = (rawName ?? rawSlug ?? string.Empty).Trim();
                if (name.Length == 0) continue;
                var slug = string.IsNullOrWhiteSpace(rawSlug) ? Slugify(name) : Slugify(rawSlug);
                if (slug.Length < 2 || slug.Length > 120 || Noise.Contains(slug)) continue;
                if (!seen.Add(slug)) continue;
                result.Add((slug, SafeText.Truncate(name, 160)));
                if (result.Count >= max) break;
            }
            return result;
        }

        /// <summary>
        /// Bir kaynagin etiketlerini oyun icin YENIDEN yazar: o kaynaktan gelmis eski satirlar
        /// listede yoksa silinir, yeni olanlar eklenir, baska kaynaktan ayni slug varsa
        /// dokunulmaz. SaveChanges cagirmaz; cagiran taraf kendi kaydetme sirasina katar.
        /// Bos liste = bu kaynagin etiketlerini temizle (ornek: IGDB listeyi bosalttiysa).
        /// </summary>
        public static async Task ReplaceAsync(GGHubDbContext context, int gameId, string source,
            IReadOnlyCollection<(string Slug, string Name)> tags, CancellationToken ct = default)
        {
            var existing = await context.GameTags.Where(t => t.GameId == gameId).ToListAsync(ct);
            Replace(context, gameId, source, tags, existing);
        }

        /// <summary>
        /// ReplaceAsync'in toplu surumu: cagiran, oyunun mevcut etiketlerini zaten cekmis
        /// (500 oyunluk parti icin tek sorgu) ve buraya verir. Tek oyun icin ReplaceAsync yeter.
        /// </summary>
        public static void Replace(GGHubDbContext context, int gameId, string source,
            IReadOnlyCollection<(string Slug, string Name)> tags, List<GameTag> existing)
        {
            var wanted = tags.ToDictionary(t => t.Slug, t => t.Name, StringComparer.Ordinal);

            foreach (var row in existing.Where(t => t.Source == source && !wanted.ContainsKey(t.Slug)).ToList())
            {
                context.GameTags.Remove(row);
                existing.Remove(row);
            }

            var present = existing.Select(t => t.Slug).ToHashSet(StringComparer.Ordinal);
            foreach (var (slug, name) in wanted)
            {
                if (!present.Add(slug)) continue;
                var row = new GameTag { GameId = gameId, Slug = slug, Name = name, Source = source };
                context.GameTags.Add(row);
                existing.Add(row);
            }
        }

        /// <summary>
        /// HENUZ KAYDEDILMEMIS bir Game icin etiketleri navigasyona ekler; ayni SaveChanges
        /// icinde oyunla birlikte yazilir (Id beklemeye gerek yok). Mevcut satir icin ReplaceAsync.
        /// </summary>
        public static void Attach(Game game, string source, IReadOnlyCollection<(string Slug, string Name)> tags)
        {
            var present = game.Tags.Select(t => t.Slug).ToHashSet(StringComparer.Ordinal);
            foreach (var (slug, name) in tags)
            {
                if (!present.Add(slug)) continue;
                game.Tags.Add(new GameTag { Slug = slug, Name = name, Source = source });
            }
        }

        /// <summary>RAWG DTO etiketleri -> temiz liste. Yalnizca Ingilizce ("eng") etiketler.</summary>
        public static List<(string Slug, string Name)> FromRawg(IEnumerable<Dtos.RawgTagDto>? tags)
        {
            if (tags == null) return new();
            return Clean(tags
                .Where(t => string.IsNullOrEmpty(t.Language) || t.Language == "eng")
                .Select(t => (t.Slug, t.Name)));
        }

        /// <summary>Steam magaza kategorileri -> temiz liste (slug addan uretilir).</summary>
        public static List<(string Slug, string Name)> FromSteam(IEnumerable<Dtos.SteamGenreDto>? categories)
        {
            if (categories == null) return new();
            return Clean(categories.Select(c => ((string?)null, c.Description)));
        }

        /// <summary>
        /// IGDB tema + mod + bakis acisi + anahtar kelime -> temiz liste. Anahtar kelimeler
        /// gurultulu ve cok (bazen 60+); ilk 25'i alinir, temalar/modlar her zaman girer.
        /// </summary>
        public static List<(string Slug, string Name)> FromIgdb(Dtos.IgdbGameDto dto)
        {
            var raw = new List<(string?, string?)>();
            void Add(IEnumerable<Dtos.IgdbNamedDto>? items, int cap)
            {
                if (items == null) return;
                foreach (var item in items.Take(cap)) raw.Add((item.Slug, item.Name));
            }
            Add(dto.Themes, 20);
            Add(dto.GameModes, 10);
            Add(dto.PlayerPerspectives, 10);
            Add(dto.Keywords, 25);
            return Clean(raw, 60);
        }
    }
}
