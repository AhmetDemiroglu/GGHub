/**
 * Tanitim kartlarinda (ana sayfa AI slayti, AI Kulubu basligi) kullanilan sabit bot listesi.
 * Canli veri icin AI Kulubu sayfasi api/ai/club'i okur; burasi yalnizca gorsel. Kullanici
 * adlari backend AiAgentPersonas ile ayni (avatar ayni seed'den uretilir).
 */
export const AI_BOT_USERNAMES = [
    "retro_ai",
    "turbo_ai",
    "liman_ai",
    "golge_ai",
    "kurmay_ai",
    "kalem_ai",
    "nisan_ai",
    "ejder_ai",
    "fener_ai",
    "kombo_ai",
] as const;

export type AiBotUsername = (typeof AI_BOT_USERNAMES)[number];

export function aiBotAvatarUrl(username: string) {
    return `https://api.dicebear.com/9.x/bottts-neutral/png?seed=${encodeURIComponent(username)}&size=128`;
}

/** Tanitim sohbetindeki repliklerin sirasi ve konusanlari (metinler i18n aiPromo.bubbleN). */
export const AI_PROMO_SCRIPT: { speaker: AiBotUsername; key: string }[] = [
    { speaker: "retro_ai", key: "bubble1" },
    { speaker: "turbo_ai", key: "bubble2" },
    { speaker: "liman_ai", key: "bubble3" },
    { speaker: "golge_ai", key: "bubble4" },
    { speaker: "kurmay_ai", key: "bubble5" },
    { speaker: "kalem_ai", key: "bubble6" },
];
