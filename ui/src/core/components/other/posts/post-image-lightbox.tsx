"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { useI18n } from "@/core/contexts/locale-context";
import { getImageUrl } from "@/core/lib/get-image-url";
import type { PostImage } from "@/models/post/post.model";

interface PostImageLightboxProps {
    images: PostImage[];
    /** Acik olan gorselin dizini; null ise kapali. */
    index: number | null;
    onIndexChange: (index: number) => void;
    onClose: () => void;
}

/**
 * Tam ekran gorsel onizleme.
 *
 * shadcn Dialog KULLANILMIYOR: Dialog kendi max-width/padding kabini dayatiyor
 * ve gorseli kucuk bir kutuya hapsediyor. Burada istenen X'teki gibi ekrani
 * kaplayan koyu bir katman; o yuzden dogrudan fixed bir overlay.
 *
 * Klavye: Escape kapatir, ok tuslari gezinir. Sayfa arkada kaymasin diye
 * acikken body kaydirmasi kilitlenir.
 */
export function PostImageLightbox({ images, index, onIndexChange, onClose }: PostImageLightboxProps) {
    const t = useI18n();
    const isOpen = index !== null;
    // Portal yalnizca istemcide kurulabilir; sunucu render'inda document yok.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const count = images.length;

    const go = useCallback(
        (delta: number) => {
            if (index === null || count === 0) return;
            onIndexChange((index + delta + count) % count);
        },
        [count, index, onIndexChange],
    );

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            else if (event.key === "ArrowRight") go(1);
            else if (event.key === "ArrowLeft") go(-1);
        };

        document.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [go, isOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const current = images[index];
    if (!current) return null;

    const overlay = (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t("posts.imagePreview")}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            // Zemine tiklayinca YALNIZCA kapanir.
            //
            // stopPropagation SART: bu bilesen React agacinda hala gonderi
            // kartinin cocugu. Portal DOM'da body'ye tasiyor ama React olaylari
            // DOM agacindan degil REACT agacindan yukari cikiyor; onlemezsek
            // kapatma tiklamasi kartin "bos alana tiklayinca detaya git"
            // isleyicisine de dusuyor ve onizlemeyi kapatirken ayni anda
            // gonderi detayina gidiliyordu.
            onClick={(event) => {
                event.stopPropagation();
                onClose();
            }}
            // Kart yalnizca onClick dinliyor ama fare olaylarinin tamamini
            // burada kesmek, ileride karta baska bir dinleyici eklendiginde
            // ayni hatanin tekrar dogmasini engelliyor.
            onMouseDown={(event) => event.stopPropagation()}
            onMouseUp={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="absolute right-4 top-4 cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
                <X className="h-5 w-5" />
            </button>

            {count > 1 ? (
                <>
                    <button
                        type="button"
                        aria-label={t("posts.previousImage")}
                        onClick={(event) => {
                            event.stopPropagation();
                            go(-1);
                        }}
                        className="absolute left-4 cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        aria-label={t("posts.nextImage")}
                        onClick={(event) => {
                            event.stopPropagation();
                            go(1);
                        }}
                        className="absolute right-4 top-1/2 cursor-pointer rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                </>
            ) : null}

            <div className="relative max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
                {/* fill degil intrinsic: gorselin kendi orani korunsun, kirpilmasin. */}
                <Image
                    src={getImageUrl(current.url) ?? current.url}
                    alt=""
                    width={current.width ?? 1280}
                    height={current.height ?? 960}
                    className="max-h-[85vh] w-auto rounded-lg object-contain"
                    unoptimized
                />
            </div>

            {count > 1 ? (
                <p className="absolute bottom-6 text-sm text-white/80">
                    {index + 1} / {count}
                </p>
            ) : null}
        </div>
    );

    // body'ye portal: kartin ustunde bir ata `transform`/`filter`/`contain`
    // tasirsa `position: fixed` o ataya gore konumlanir ve katman ekrani
    // kaplamaz. Portal bu tuzagi bastan kapatiyor.
    return createPortal(overlay, document.body);
}
