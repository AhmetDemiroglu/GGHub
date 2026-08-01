"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { MentionText, MENTION_PATTERN_SOURCE } from "@/core/components/base/mention-text";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { cn } from "@/core/lib/utils";
import { MentionTargetType, type PostMention } from "@/models/post/post.model";

/**
 * Gonderi metnindeki TIPLI etiket token'i. Backend'deki
 * GGHub.Core/Specifications/MentionTokens.PatternSource ile AYNI olmali.
 */
export const MENTION_TOKEN_PATTERN_SOURCE = "@\\[(u|g|l):(\\d{1,10})\\]";

const PREFIX_TO_TYPE: Record<string, MentionTargetType> = {
    u: MentionTargetType.User,
    g: MentionTargetType.Game,
    l: MentionTargetType.List,
};

const TYPE_CLASS: Record<MentionTargetType, string> = {
    [MentionTargetType.User]: "text-mention",
    [MentionTargetType.Game]: "text-mention-game",
    [MentionTargetType.List]: "text-mention-list",
};

interface PostTextProps {
    /** Token'li ham metin. */
    text: string;
    /** Sunucudan gelen cozulmus hedefler; token sirasiyla ayni sirada gelir. */
    mentions: PostMention[];
    className?: string;
    /**
     * false ise etiketler boyanir ama tiklanamaz. Tiklanabilir kart icindeki
     * onizlemeler icin: ic ice link kartin kendi tiklamasiyla catisir.
     */
    linkify?: boolean;
    onNavigate?: () => void;
}

/**
 * Gonderi govdesini cizer.
 *
 * Iki gecis var ve SIRASI onemli:
 *   1. Tipli token'lar ("@[g:340]") cozulmus ada ve renkli cipe cevrilir.
 *   2. Aralarda kalan duz metin MentionText'e verilir, boylece kullanicinin
 *      acilir listeden secmeden elle yazdigi "@ahmet" yine linklenir ve
 *      incelemelerdeki mevcut etiket davranisi birebir korunur.
 *
 * Cozulemeyen token (silinmis oyun, gorunmeyen liste) duz gri metne duser;
 * hedefin adi ASLA istemcide tutulmadigi icin sizinti olmaz.
 */
export function PostText({ text, mentions, className, linkify = true, onNavigate }: PostTextProps) {
    const localizeHref = useLocalizedHref();

    // Regex her cagride yeniden uretiliyor: /g bayrakli paylasimli instance'in
    // lastIndex'i eszamanli render'larda birbirine karisirdi (MentionText ile ayni gerekce).
    const pattern = new RegExp(MENTION_TOKEN_PATTERN_SOURCE, "g");

    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let tokenIndex = 0;
    let match: RegExpExecArray | null;

    const pushPlain = (chunk: string) => {
        if (!chunk) return;
        nodes.push(
            <MentionText
                key={`plain-${key++}`}
                text={chunk}
                linkify={linkify}
                onNavigate={onNavigate}
            />,
        );
    };

    while ((match = pattern.exec(text)) !== null) {
        pushPlain(text.slice(lastIndex, match.index));

        const type = PREFIX_TO_TYPE[match[1]];
        const targetId = Number(match[2]);
        // Sunucu etiketleri metindeki sirayla donuyor; ayni sira burada da gecerli.
        const mention = mentions[tokenIndex++];
        const isMatch = mention && mention.type === type && mention.id === targetId;

        if (!isMatch || !mention.resolved) {
            // Cozulemedi: adi bilmiyoruz, token'i da ham haliyle basmak
            // istemiyoruz. Notr bir yer tutucu.
            nodes.push(
                <span key={`unresolved-${key++}`} className="text-muted-foreground/70">
                    @?
                </span>,
            );
        } else {
            const label = `@${mention.display}`;
            const className = cn("font-medium", TYPE_CLASS[type]);

            const href =
                type === MentionTargetType.User
                    ? `/profiles/${mention.slug ?? mention.display}`
                    : type === MentionTargetType.Game
                      ? `/games/${mention.slug ?? mention.id}`
                      : `/lists/${mention.id}`;

            nodes.push(
                linkify ? (
                    <Link
                        key={`mention-${key++}`}
                        href={localizeHref(href)}
                        className={cn(className, "hover:underline")}
                        onClick={onNavigate}
                    >
                        {label}
                    </Link>
                ) : (
                    <span key={`mention-${key++}`} className={className}>
                        {label}
                    </span>
                ),
            );
        }

        lastIndex = match.index + match[0].length;
    }

    pushPlain(text.slice(lastIndex));

    return <span className={className}>{nodes}</span>;
}

/**
 * Token'lari cozulmus adlariyla degistirip KULLANICIYA GORUNEN uzunlugu verir.
 * Composer sayaci bunu kullanir; backend de ayni hesabi yapiyor
 * (MentionTokens.VisibleLength), yoksa "sayac 197 diyordu ama gonderi gitmedi"
 * durumu olusurdu.
 */
export function visibleLength(text: string, displayByToken: string[]): number {
    const pattern = new RegExp(MENTION_TOKEN_PATTERN_SOURCE, "g");
    let total = text.length;
    let index = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const display = displayByToken[index++] ?? "";
        total = total - match[0].length + display.length + 1; // +1 = "@"
    }

    return total;
}

/** Legacy duz "@handle" deseni; composer'in token uretmeyen yolu icin. */
export { MENTION_PATTERN_SOURCE };
