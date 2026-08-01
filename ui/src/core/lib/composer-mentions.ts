import { MentionTargetType } from "@/models/post/post.model";

/** Composer'da acilir listeden secilmis bir etiket. */
export interface PickedMention {
    /** Metne eklenen tam parca, ornegin "@Elden Ring". */
    text: string;
    type: MentionTargetType;
    id: number;
}

export type ComposerSegment =
    | { kind: "text"; value: string }
    | { kind: "mention"; value: string; type: MentionTargetType; id: number };

/**
 * Composer metnini duz metin ve SECILMIS etiket parcalarina ayirir.
 *
 * Tarama sirali ve tuketimli: her secilmis etiket metinde bir kez aranir ve
 * bulundugu ilk yerden sonrasi icin tuketilir. Kullanici o parcayi silmis ya da
 * bozmussa eslesme olmaz; etiket sessizce duz metne duser (yanlis hedefe link
 * verilmez).
 *
 * Hem YAZARKEN renklendirme hem de GONDERIRKEN token'a cevirme bu tek
 * fonksiyondan besleniyor. Iki ayri tarama yazilsaydi biri digerinden sapar ve
 * kullanicinin ekranda renkli gordugu etiket sunucuya token olarak gitmeyebilirdi.
 */
export function segmentComposerText(value: string, picked: PickedMention[]): ComposerSegment[] {
    const segments: ComposerSegment[] = [];
    const remaining = [...picked];
    let cursor = 0;

    while (cursor < value.length) {
        let bestIndex = -1;
        let bestAt = Number.MAX_SAFE_INTEGER;

        for (let i = 0; i < remaining.length; i++) {
            const at = value.indexOf(remaining[i].text, cursor);
            if (at !== -1 && at < bestAt) {
                bestAt = at;
                bestIndex = i;
            }
        }

        if (bestIndex === -1) break;

        const hit = remaining[bestIndex];
        if (bestAt > cursor) segments.push({ kind: "text", value: value.slice(cursor, bestAt) });
        segments.push({ kind: "mention", value: hit.text, type: hit.type, id: hit.id });

        cursor = bestAt + hit.text.length;
        remaining.splice(bestIndex, 1);
    }

    if (cursor < value.length) segments.push({ kind: "text", value: value.slice(cursor) });

    return segments;
}

const PREFIX: Record<MentionTargetType, string> = {
    [MentionTargetType.User]: "u",
    [MentionTargetType.Game]: "g",
    [MentionTargetType.List]: "l",
};

/**
 * Gorunen metni sunucunun bekledigi token'li metne cevirir.
 * Bolumleme yukaridaki fonksiyondan geldigi icin ekranda renkli gorunen her
 * etiket birebir token'a doner.
 */
export function toTokenizedContent(value: string, picked: PickedMention[]): string {
    return segmentComposerText(value, picked)
        .map((segment) =>
            segment.kind === "mention" ? `@[${PREFIX[segment.type]}:${segment.id}]` : segment.value,
        )
        .join("");
}
