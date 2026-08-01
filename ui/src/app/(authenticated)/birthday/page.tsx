"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Cake, Gift, PartyPopper } from "lucide-react";

import { getMyBirthday } from "@/api/profile/profile.api";
import { AuthGuard } from "@/core/components/base/auth-guard";
import { BirthdayCake } from "@/core/components/other/birthday/birthday-cake";
import { Confetti } from "@/core/components/other/birthday/confetti";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";

/**
 * "2026-07-18" -> "18 Temmuz 2026".
 *
 * DIKKAT: new Date("2026-07-18") UTC gece yarisi olarak parse edilir ve negatif offsetli
 * bir saat diliminde toLocaleDateString bir onceki gunu yazar. Parcalari ELLE veriyoruz.
 */
function formatCelebrationDate(value: string, locale: string): string {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return value;

    return new Date(year, month - 1, day).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/**
 * Kisiye ozel dogum gunu kutlama sayfasi.
 *
 * URL'de kullanici kimligi YOK: sunucu veriyi yalnizca token'dan cozer, dolayisiyla
 * baskasinin sayfasini gormek yapisal olarak imkansiz. Sayfa kabugunda hicbir kisisel
 * veri bulunmaz; isim ve tarih SADECE yetkili istekten gelir (bu yuzden generateMetadata
 * ile baslikta isim gostermek gibi bir sey EKLENMEMELI).
 */
export default function BirthdayPage() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const localizeHref = useLocalizedHref();

    const { data, isLoading, error } = useQuery({
        queryKey: ["my-birthday"],
        queryFn: getMyBirthday,
        // 404 "dogum tarihi kayitli degil" demek, gecici bir hata degil: tekrar denenmez.
        retry: false,
        staleTime: 60_000,
    });

    if (isLoading) {
        // BILEREK konfeti degil: animasyon isim bilinmeden baslamamali.
        return (
            <AuthGuard>
                <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 p-6">
                    <Skeleton className="h-44 w-44 rounded-full" />
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-80" />
                </div>
            </AuthGuard>
        );
    }

    if (error) {
        const notFound = isAxiosError(error) && error.response?.status === 404;

        return (
            <AuthGuard>
                <div className="mx-auto flex w-full max-w-xl flex-col items-center p-6">
                    <Card className="w-full">
                        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                            <div className="rounded-full bg-muted p-4">
                                <Gift className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h1 className="text-xl font-semibold">{notFound ? t("birthdayPage.emptyTitle") : t("birthdayPage.errorTitle")}</h1>
                            <p className="max-w-sm text-sm text-muted-foreground">{notFound ? t("birthdayPage.emptyDescription") : t("birthdayPage.errorDescription")}</p>
                            {notFound && (
                                <Button asChild>
                                    <Link href={localizeHref("/profile")}>{t("birthdayPage.emptyAction")}</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </AuthGuard>
        );
    }

    if (!data) return null;

    const heading = data.isToday ? t("birthdayPage.title", { name: data.displayName }) : t("birthdayPage.pastTitle", { name: data.displayName });
    const subtitle = data.isToday ? t("birthdayPage.subtitle") : t("birthdayPage.pastSubtitle");

    return (
        <AuthGuard>
            {data.isToday && <Confetti />}

            <div className="bg-radial relative mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-10 md:py-16">
                <BirthdayCake />

                <h1 className="mt-4 text-center text-3xl font-bold tracking-tight md:text-4xl">{heading}</h1>
                <p className="mt-3 max-w-md text-center text-muted-foreground">{subtitle}</p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-2 text-sm backdrop-blur">
                    <Cake className="h-4 w-4 text-fuchsia-500" />
                    <span className="text-muted-foreground">{t("birthdayPage.dateLabel")}:</span>
                    <span className="font-semibold">{formatCelebrationDate(data.celebrationDate, locale)}</span>
                </div>

                <Button asChild className="mt-8" variant="outline">
                    <Link href={localizeHref("/")}>
                        <PartyPopper className="h-4 w-4" />
                        {t("birthdayPage.backHome")}
                    </Link>
                </Button>
            </div>
        </AuthGuard>
    );
}
