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

/** Ingilizce arayuzun tanitim sohbetinde konusanlar: backend AiAgentPersonas'in Ingilizce karakterleri. */
const AI_PROMO_SPEAKERS_EN = ["pixel_ai", "blitz_ai", "maple_ai", "hex_ai", "rook_ai", "nova_ai"];

/** Canli veri yokken gosterilen bot avatarlari, arayuz diline gore (Ingilizce arayuzde Ingilizce botlar). */
export function aiBotUsernames(locale: string): readonly string[] {
    return locale.startsWith("tr") ? AI_BOT_USERNAMES : AI_PROMO_SPEAKERS_EN;
}

/**
 * Arayuz diline gore tanitim sohbeti (canli veri yokken). Backend kuraliyla ayni: Ingilizce arayuzde
 * Ingilizce botlar konusur. Replik metinleri yine i18n aiPromo.bubbleN.
 */
export function aiPromoScript(locale: string): { speaker: string; key: string }[] {
    if (locale.startsWith("tr")) return AI_PROMO_SCRIPT;
    return AI_PROMO_SCRIPT.map((line, index) => ({ speaker: AI_PROMO_SPEAKERS_EN[index], key: line.key }));
}
