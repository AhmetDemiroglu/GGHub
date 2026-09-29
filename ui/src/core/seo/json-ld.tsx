import type { AppLocale } from "@/i18n/config";
import { buildLocalizedPathname } from "@/i18n/config";
import type { Game } from "@/models/gaming/game.model";
import type { Review } from "@/models/review/review.model";
import type { Post } from "@/models/post/post.model";
import type { PublicProfile } from "@/models/profile/profile.model";
import { getGameImageUrl } from "@/core/lib/get-image-url";
import { APP_STORE_ID, LOGO_URL, SAME_AS_LINKS, SITE_EMAIL, SITE_NAME, SITE_URL, SOCIAL_PROFILES, absoluteUrl } from "./site";
import { displayNameOf, stripHtml, toPlainPostText, truncate } from "./text";

/**
 * JSON-LD (schema.org) uretimi. Google zengin sonuclar ve yapay zeka arama motorlari
 * (ChatGPT, Perplexity, Google AI Overviews) sayfanin ne oldugunu buradan okur: oyun mu,
 * inceleme mi, profil mi, liste mi. Butun builder'lar duz nesne dondurur; <JsonLd> cizer.
 */
export type JsonLdObject = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** GGHub puani 1-10 tam sayi (inceleme diyalogu 10 buton). RAWG 0-5, IGDB/Metacritic 0-100. */
const GGHUB_BEST_RATING = 10;

/** Kucuk "<" kacisi: JSON icinde "</script>" gecerse tarayici script'i erken kapatir. */
const serialize = (data: JsonLdObject | JsonLdObject[]) => JSON.stringify(data).replace(/</g, "\\u003c");

export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(data) }} />;
}

const localizedUrl = (path: string, locale: AppLocale) => absoluteUrl(buildLocalizedPathname(path, locale));

const inLanguage = (locale: AppLocale) => (locale === "tr" ? "tr-TR" : "en-US");

const person = (user: { username: string; firstName?: string | null; lastName?: string | null; profileImageUrl?: string | null }, locale: AppLocale): JsonLdObject => ({
    "@type": "Person",
    name: displayNameOf(user),
    alternateName: `@${user.username}`,
    url: localizedUrl(`/profiles/${user.username}`, locale),
    ...(user.profileImageUrl ? { image: absoluteUrl(user.profileImageUrl) } : {}),
});

export const organizationJsonLd = (): JsonLdObject => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: "GGHub",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: LOGO_URL, width: 719, height: 579 },
    email: SITE_EMAIL,
    sameAs: SAME_AS_LINKS,
    founder: { "@type": "Person", name: "Ahmet Demiroğlu", url: "https://github.com/AhmetDemiroglu" },
    foundingLocation: { "@type": "Place", name: "İzmir, Türkiye" },
});

export const webSiteJsonLd = (locale: AppLocale): JsonLdObject => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: ["GGHub Social", "GGHub Oyuncu Sosyal Platformu", "GGHub Games Community"],
    url: SITE_URL,
    inLanguage: ["tr-TR", "en-US"],
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${localizedUrl("/discover", locale)}?search={search_term_string}` },
        "query-input": "required name=search_term_string",
    },
});

export const mobileApplicationJsonLd = (): JsonLdObject => ({
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "@id": `${SITE_URL}/download-app#app`,
    name: SITE_NAME,
    alternateName: "GGHub: Games Community",
    url: `${SITE_URL}/download-app`,
    operatingSystem: "iOS, Android",
    applicationCategory: "SocialNetworkingApplication",
    applicationSubCategory: "Games community",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    installUrl: [SOCIAL_PROFILES.appStore, SOCIAL_PROFILES.googlePlay].filter(Boolean),
    sameAs: [SOCIAL_PROFILES.appStore, SOCIAL_PROFILES.googlePlay].filter(Boolean),
    identifier: `id${APP_STORE_ID}`,
    publisher: { "@id": ORGANIZATION_ID },
});

export const breadcrumbJsonLd = (locale: AppLocale, items: { name: string; path: string }[]): JsonLdObject => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: localizedUrl(item.path, locale),
    })),
});

export const webPageJsonLd = (input: { locale: AppLocale; path: string; name: string; description: string; type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage" }): JsonLdObject => ({
    "@context": "https://schema.org",
    "@type": input.type ?? "WebPage",
    "@id": `${localizedUrl(input.path, input.locale)}#webpage`,
    url: localizedUrl(input.path, input.locale),
    name: input.name,
    description: input.description,
    inLanguage: inLanguage(input.locale),
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
});

export const faqJsonLd = (items: { question: string; answer: string }[]): JsonLdObject => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
});

const gameDescription = (game: Pick<Game, "description" | "descriptionTr">, locale: AppLocale) =>
    stripHtml(locale === "tr" ? game.descriptionTr || game.description : game.description || game.descriptionTr);

export const videoGameJsonLd = (game: Game, locale: AppLocale, reviews: Review[] = []): JsonLdObject => {
    const url = localizedUrl(`/games/${game.slug}`, locale);
    const description = truncate(gameDescription(game, locale), 1000);
    const image = getGameImageUrl(game.backgroundImage, 1280);

    return {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        "@id": `${url}#game`,
        name: game.name,
        url,
        inLanguage: inLanguage(locale),
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(game.released ? { datePublished: game.released } : {}),
        ...(game.genres?.length ? { genre: game.genres.map((genre) => genre.name) } : {}),
        ...(game.platforms?.length ? { gamePlatform: game.platforms.map((platform) => platform.name) } : {}),
        ...(game.developers?.length ? { author: game.developers.map((developer) => ({ "@type": "Organization", name: developer.name })) } : {}),
        ...(game.publishers?.length ? { publisher: game.publishers.map((publisher) => ({ "@type": "Organization", name: publisher.name })) } : {}),
        ...(game.esrbRating ? { contentRating: game.esrbRating } : {}),
        ...(game.websiteUrl ? { sameAs: game.websiteUrl } : {}),
        ...(game.gghubRating && game.gghubRatingCount
            ? {
                  aggregateRating: {
                      "@type": "AggregateRating",
                      ratingValue: Number(game.gghubRating.toFixed(1)),
                      bestRating: GGHUB_BEST_RATING,
                      worstRating: 1,
                      ratingCount: game.gghubRatingCount,
                  },
              }
            : {}),
        ...(reviews.length
            ? {
                  review: reviews.slice(0, 5).map((review) => ({
                      "@type": "Review",
                      author: person(review.user, locale),
                      datePublished: review.createdAt,
                      reviewBody: truncate(review.content, 500),
                      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: GGHUB_BEST_RATING, worstRating: 1 },
                  })),
              }
            : {}),
    };
};

export const reviewJsonLd = (review: Review, locale: AppLocale): JsonLdObject => {
    const url = localizedUrl(`/reviews/${review.id}`, locale);
    const game = review.game;
    const image = getGameImageUrl(game?.backgroundImage ?? game?.coverImage, 1280);

    return {
        "@context": "https://schema.org",
        "@type": "Review",
        "@id": `${url}#review`,
        url,
        inLanguage: inLanguage(locale),
        author: person(review.user, locale),
        datePublished: review.createdAt,
        reviewBody: review.content,
        reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: GGHUB_BEST_RATING, worstRating: 1 },
        publisher: { "@id": ORGANIZATION_ID },
        ...(game
            ? {
                  itemReviewed: {
                      "@type": "VideoGame",
                      name: game.name,
                      url: localizedUrl(`/games/${game.slug}`, locale),
                      ...(image ? { image } : {}),
                      ...(game.released ? { datePublished: game.released } : {}),
                  },
              }
            : {}),
    };
};

export const profilePageJsonLd = (profile: PublicProfile, locale: AppLocale): JsonLdObject => {
    const url = localizedUrl(`/profiles/${profile.username}`, locale);

    return {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": `${url}#profile`,
        url,
        inLanguage: inLanguage(locale),
        dateCreated: profile.createdAt,
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: {
            "@type": "Person",
            "@id": `${url}#person`,
            name: displayNameOf(profile),
            alternateName: `@${profile.username}`,
            identifier: profile.username,
            url,
            ...(profile.bio ? { description: profile.bio } : {}),
            ...(profile.profileImageUrl ? { image: absoluteUrl(profile.profileImageUrl) } : {}),
            interactionStatistic: [
                { "@type": "InteractionCounter", interactionType: "https://schema.org/FollowAction", userInteractionCount: profile.followerCount ?? 0 },
                { "@type": "InteractionCounter", interactionType: "https://schema.org/WriteAction", userInteractionCount: profile.reviewCount ?? 0 },
            ],
        },
    };
};

export type ItemListEntry = { name: string; path: string; image?: string | null };

/** Keşfet ve liste sayfalari: sayfadaki oyunlar sirali bir ItemList olarak isaretlenir. */
export const collectionPageJsonLd = (input: { locale: AppLocale; path: string; name: string; description: string; items: ItemListEntry[]; author?: JsonLdObject }): JsonLdObject => {
    const url = localizedUrl(input.path, input.locale);

    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url,
        name: input.name,
        description: input.description,
        inLanguage: inLanguage(input.locale),
        isPartOf: { "@id": WEBSITE_ID },
        ...(input.author ? { author: input.author } : {}),
        mainEntity: {
            "@type": "ItemList",
            name: input.name,
            numberOfItems: input.items.length,
            itemListElement: input.items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.name,
                url: localizedUrl(item.path, input.locale),
                ...(item.image ? { image: item.image } : {}),
            })),
        },
    };
};

export const socialPostJsonLd = (post: Post, locale: AppLocale): JsonLdObject => {
    const url = localizedUrl(`/posts/${post.id}`, locale);
    const text = toPlainPostText(post.content, post.mentions);

    return {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        "@id": `${url}#post`,
        url,
        inLanguage: inLanguage(locale),
        headline: truncate(text, 110),
        articleBody: text,
        datePublished: post.createdAt,
        author: person(post.author, locale),
        ...(post.images?.length ? { image: post.images.map((image) => absoluteUrl(image.url)) } : {}),
        interactionStatistic: [
            { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: post.likeCount },
            { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: post.replyCount },
            { "@type": "InteractionCounter", interactionType: "https://schema.org/ShareAction", userInteractionCount: post.repostCount },
        ],
        isPartOf: { "@id": WEBSITE_ID },
    };
};

export { person as personJsonLd };
