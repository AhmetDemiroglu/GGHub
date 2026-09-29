import type { PostMention } from "@/models/post/post.model";
import { toPlainMentionText } from "@/core/lib/mention-tokens";

const HTML_ENTITIES: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
};

/** RAWG aciklamalari HTML gelir; meta description ve JSON-LD duz metin ister. */
export const stripHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    return html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/p>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&(nbsp|amp|quot|#39|apos|lt|gt);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
        .replace(/\s+/g, " ")
        .trim();
};

/**
 * Kelime sinirinda kisaltir. Meta description icin 160, OG icin 200, JSON-LD govdesi icin
 * daha uzun kullanilir; sonuna "…" eklenir ve asla kelime ortasindan kesmez.
 */
export const truncate = (text: string, max = 160): string => {
    if (text.length <= max) return text;
    const cut = text.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
};

/** HTML temizle + kisalt: oyun aciklamasi -> meta description. */
export const toDescription = (html: string | null | undefined, max = 160): string => truncate(stripHtml(html), max);

/** Gonderi icerigini (token'li) meta/JSON-LD icin duz metne cevirir. */
export const toPlainPostText = (content: string | null | undefined, mentions: PostMention[] | undefined): string => {
    if (!content) return "";
    return toPlainMentionText(content, (mentions ?? []).map((mention) => mention.display)).replace(/\s+/g, " ").trim();
};

/** "Ad Soyad" varsa onu, yoksa kullanici adini dondurur (profil ve inceleme basliklari). */
export const displayNameOf = (user: { username: string; firstName?: string | null; lastName?: string | null }): string => {
    const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return full || user.username;
};
