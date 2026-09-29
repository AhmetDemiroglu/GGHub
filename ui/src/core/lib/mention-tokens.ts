/**
 * Gonderi metnindeki TIPLI etiket token'i ("@[u:12]", "@[g:340]", "@[l:7]").
 * Backend'deki GGHub.Core/Specifications/MentionTokens.PatternSource ile AYNI olmali.
 *
 * Bu dosya "use client" DEGIL: sunucu tarafi metadata (gonderi basligi/aciklamasi, JSON-LD)
 * da ayni deseni kullanir. post-text.tsx istemci cizimi icin buradan import eder.
 */
export const MENTION_TOKEN_PATTERN_SOURCE = "@\\[(u|g|l):(\\d{1,10})\\]";

/**
 * Token'li metni duz metne cevirir: her token, sirasiyla `displayByToken` icindeki gorunen
 * adla ("@ahmet", "@Elden Ring") degistirilir. Sira tabanli eslestirme PostText ile birebir
 * ayni kural; eksik ad kalirsa token oldugu gibi kalmaz, "@" olarak dusurulur.
 */
export const toPlainMentionText = (text: string, displayByToken: string[]): string => {
    const pattern = new RegExp(MENTION_TOKEN_PATTERN_SOURCE, "g");
    let index = 0;
    return text.replace(pattern, () => {
        const display = displayByToken[index++];
        return display ? `@${display}` : "@";
    });
};
