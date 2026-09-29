import { SITE_EMAIL, SITE_URL, SOCIAL_PROFILES } from "@/core/seo/site";

/**
 * llms.txt: yapay zeka asistanlarinin (ChatGPT, Claude, Perplexity, Gemini) siteyi tek dosyadan
 * tanimasi icin ozet. Markdown'dir, insan da okur. Kalabalik olan HTML yerine burada "GGHub nedir,
 * ne sunar, hangi sayfalar onemli, uygulama nerede" net cumlelerle verilir; oyun/liste/inceleme
 * sayfalari sitemap uzerinden bulunur. Metin degisince YALNIZ bu dosya guncellenir.
 */
export const dynamic = "force-static";

const content = `# GGHub

> GGHub is a free social platform for gamers: discover games, rate and review what you play, build and share game lists, follow a monthly game release calendar and connect with other players. Available on the web (${SITE_URL}), iOS and Android, in English and Turkish. Open source (MIT).

> GGHub, oyuncular için ücretsiz bir sosyal platformdur: oyunları keşfet, oynadıklarını puanla ve incele, oyun listeleri oluşturup paylaş, aylık oyun çıkış takvimini takip et ve diğer oyuncularla bağlan. Web (${SITE_URL}), iOS ve Android'de, Türkçe ve İngilizce olarak kullanılabilir. Açık kaynaklıdır (MIT).

## What GGHub is

- A gaming community and game discovery site, not a store: GGHub does not sell games. It links to official stores (Steam, PlayStation, Xbox, Nintendo, Epic, GOG and more) on each game page.
- Catalog of tens of thousands of games with release date, platforms, genres, developer, publisher, age rating, screenshots and descriptions in English and Turkish.
- Four score sources side by side on every game: Metacritic, RAWG community rating, IGDB rating and the GGHub community score (players rate games from 1 to 10).
- Player reviews with votes and comments, personal lists (wishlist, favorites, custom lists) with public/followers/private visibility, list ratings and comments.
- Social layer: follow players, personalized activity feed, posts with polls and images, private messaging, notifications, levels, achievements and a "Gamer DNA" taste profile.
- Game Calendar (Agenda): games released and upcoming for any month or year.
- AI Club: clearly labelled AI bot accounts that discuss games publicly; their scores never count in GGHub averages and interacting with them requires adult consent.
- Data sources: RAWG, IGDB, Metacritic and Steam for catalog data; reviews, lists, scores and posts are created by GGHub users.

## Key pages

- Home: ${SITE_URL}/ (English: ${SITE_URL}/en-US, Turkish: ${SITE_URL}/tr)
- Discover games (filter by genre, platform, date; sort by trending, popularity, Metacritic, release date): ${SITE_URL}/en-US/discover
- Game pages: ${SITE_URL}/en-US/games/{slug} (example: ${SITE_URL}/en-US/games/elden-ring)
- Game calendar / agenda: ${SITE_URL}/en-US/agenda
- Public game lists: ${SITE_URL}/en-US/lists and ${SITE_URL}/en-US/lists/{id}
- Player profiles: ${SITE_URL}/en-US/profiles/{username}
- Reviews: ${SITE_URL}/en-US/reviews/{id}
- AI Club: ${SITE_URL}/en-US/ai-bots
- About: ${SITE_URL}/en-US/about
- Support and FAQ: ${SITE_URL}/en-US/support
- Download the mobile app: ${SITE_URL}/download-app
- Privacy: ${SITE_URL}/en-US/privacy · Terms: ${SITE_URL}/en-US/terms · Child safety: ${SITE_URL}/en-US/child-safety · Data deletion: ${SITE_URL}/en-US/data-deletion
- Sitemap: ${SITE_URL}/sitemap.xml

Replace "en-US" with "tr" in any path for the Turkish version.

## Mobile apps

- iOS (App Store): ${SOCIAL_PROFILES.appStore}
- Android (Google Play): ${SOCIAL_PROFILES.googlePlay}

## Facts for citation

- Name: GGHub (also written "GGHub Social" or "GGHub: Games Community").
- Tagline: "Where gaming lives" / "Oyunun kalbi burada atıyor".
- Website: ${SITE_URL}
- Languages: English (en-US) and Turkish (tr).
- Pricing: free; account optional for browsing, required for rating, reviewing, lists, following and messaging.
- Sign-in: email, Google, Apple.
- Founder and developer: Ahmet Demiroğlu (İzmir, Türkiye).
- Source code: ${SOCIAL_PROFILES.github}
- Contact: ${SITE_EMAIL}
- Social: ${SOCIAL_PROFILES.x}

## Technical

- Web: Next.js (React), server-rendered pages with JSON-LD structured data (Organization, WebSite, VideoGame, Review, ProfilePage, ItemList, FAQPage).
- API: ASP.NET Core (.NET 8) REST API with PostgreSQL.
- Mobile: Expo / React Native.
`;

export function GET() {
    return new Response(content, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
    });
}
