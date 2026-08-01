"use client";

import { useState } from "react";
import Image from "next/image";

import { PostImageLightbox } from "@/core/components/other/posts/post-image-lightbox";
import { useI18n } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";
import type { PostImage } from "@/models/post/post.model";

interface PostImageGridProps {
    images: PostImage[];
    className?: string;
}

/**
 * 1-4 gorsel icin X benzeri yerlesim:
 *   1 -> tek genis kutu (oranini korur)
 *   2 -> yan yana iki esit kutu
 *   3 -> solda buyuk, sagda ust uste iki kucuk
 *   4 -> 2x2
 *
 * Yukseklik SABIT tutuluyor (aspect kutulari): akista gorseller inerken
 * kart ziplamasin. Tek gorselde de sabit oranli kutu kullaniliyor cunku
 * sunucudan gelen width/height her zaman dolu olmayabilir (eski kayitlar).
 *
 * Her hucre bir <button>: hem tam ekran onizlemeyi acar, hem de kartin
 * "bos alana tiklayinca detaya git" isleyicisi tarafindan otomatik dislanir
 * (o isleyici closest("a,button,...") ile ic ogeleri atliyor). Boylece gorsele
 * tiklamak detaya gitmez, onizleme acar; X'teki davranisin aynisi.
 */
export function PostImageGrid({ images, className }: PostImageGridProps) {
    const t = useI18n();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (images.length === 0) return null;

    const sorted = [...images].sort((a, b) => a.position - b.position).slice(0, 4);

    const cell = (image: PostImage, position: number, extra?: string) => (
        <button
            key={image.url}
            type="button"
            aria-label={t("posts.imagePreview")}
            onClick={() => setOpenIndex(position)}
            className={cn("relative cursor-zoom-in overflow-hidden bg-muted", extra)}
        >
            <Image
                // getImageUrl bos girdide undefined doner; gorsel adresi hic bos
                // olmamali ama tip guvenligi icin ham adrese dusuluyor.
                src={getImageUrl(image.url) ?? image.url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover transition-transform duration-200 hover:scale-[1.02]"
            />
        </button>
    );

    const grid = (() => {
        if (sorted.length === 1) {
            return (
                <div className={cn("mt-3 overflow-hidden rounded-xl border border-border/50", className)}>
                    {cell(sorted[0], 0, "aspect-[16/10] w-full")}
                </div>
            );
        }

        if (sorted.length === 2) {
            return (
                <div className={cn("mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-border/50", className)}>
                    {sorted.map((image, i) => cell(image, i, "aspect-square"))}
                </div>
            );
        }

        if (sorted.length === 3) {
            return (
                <div className={cn("mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-border/50", className)}>
                    {cell(sorted[0], 0, "row-span-2 aspect-[1/2]")}
                    {cell(sorted[1], 1, "aspect-square")}
                    {cell(sorted[2], 2, "aspect-square")}
                </div>
            );
        }

        return (
            <div className={cn("mt-3 grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl border border-border/50", className)}>
                {sorted.map((image, i) => cell(image, i, "aspect-square"))}
            </div>
        );
    })();

    return (
        <>
            {grid}
            <PostImageLightbox
                images={sorted}
                index={openIndex}
                onIndexChange={setOpenIndex}
                onClose={() => setOpenIndex(null)}
            />
        </>
    );
}
