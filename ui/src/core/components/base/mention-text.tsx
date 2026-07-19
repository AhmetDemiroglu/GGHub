"use client";

import type { ReactNode } from "react";

import { UserLink } from "@/core/components/base/user-link";
import { cn } from "@/core/lib/utils";

/**
 * Backend'in mention semantigi ile ayni: "@" oncesinde harf/rakam/alt-cizgi/nokta OLMAMALI,
 * handle 3-30 karakter. Bastaki karakter guvencesi "a@b.com" gibi e-postalarin eslesmesini engeller.
 * Lookbehind tasinabilirlik icin BILEREK kullanilmiyor; onceki karakter yakalanip aynen geri basiliyor.
 * Grup 1 = onceki karakter, Grup 2 = handle.
 */
export const MENTION_PATTERN_SOURCE = "(^|[^\\p{L}\\p{N}_.])@([\\p{L}\\p{N}_.]{3,30})";

interface MentionTextProps {
    /** Yorum/inceleme govdesi. */
    text: string;
    className?: string;
    /** Mention linkine ekstra sinif. */
    mentionClassName?: string;
    /** Mention'a tiklaninca popover/dialog kapatmak isteyenler icin. */
    onNavigate?: () => void;
    /**
     * false ise mention boyanir ama TIKLANABILIR OLMAZ. Tikanabilir bir kartin
     * icindeki kirpilmis onizlemeler icin: orada ic ice link, kartin kendi
     * tiklamasiyla catisir ve kullanici yanlislikla profile dusar.
     */
    linkify?: boolean;
}

export function MentionText({ text, className, mentionClassName, onNavigate, linkify = true }: MentionTextProps) {
    // Regex her cagride yeniden uretiliyor: /g bayrakli paylasimli bir instance'in lastIndex'i
    // eszamanli render'larda birbirine karisirdi.
    const pattern = new RegExp(MENTION_PATTERN_SOURCE, "gu");

    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const [full, precedingChar, handle] = match;

        // Eslesme oncesi duz metin + yakalanan onceki karakter aynen geri basilir.
        nodes.push(`${text.slice(lastIndex, match.index)}${precedingChar}`);

        // Istemci hangi handle'in gercek oldugunu BILMEZ, iyimser linkleriz. Bu guvenli:
        // /profiles/{olmayan} ile /profiles/{gizli} AYNI 404'u doner, yani sizinti olmaz.
        nodes.push(
            linkify ? (
                <UserLink
                    key={`mention-${key++}`}
                    user={{ username: handle }}
                    variant="inline"
                    className={cn("font-medium text-mention hover:underline", mentionClassName)}
                    onNavigate={onNavigate}
                />
            ) : (
                <span key={`mention-${key++}`} className={cn("font-medium text-mention", mentionClassName)}>
                    @{handle}
                </span>
            )
        );

        lastIndex = match.index + full.length;
    }

    nodes.push(text.slice(lastIndex));

    return <span className={className}>{nodes}</span>;
}
