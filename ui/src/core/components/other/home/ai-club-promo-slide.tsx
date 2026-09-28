"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAiClub } from "@/api/ai/ai-club.api";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { cn } from "@/core/lib/utils";
import { AiChatDemo, AiClubBackground, FloatingBot } from "@/core/components/other/ai-club/ai-club-art";

/** Masaustunde sohbet kartinin etrafinda yuzen botlarin yerleri (botlar API'den sirayla oturur). */
const DESKTOP_SLOTS: { className: string; size: number; delay: number; tilt: number }[] = [
    { className: "right-[33%] top-8 lg:right-[36%]", size: 50, delay: 0, tilt: -8 },
    { className: "right-5 top-5 lg:right-10", size: 46, delay: 0.8, tilt: 7 },
    { className: "bottom-10 right-[35%] lg:right-[38%]", size: 42, delay: 1.6, tilt: 10 },
    { className: "bottom-5 right-6 lg:right-12", size: 48, delay: 0.4, tilt: -6 },
];

/** API gelmezse (ya da bot yoksa) kullanilan yedek bot listesi. */
const FALLBACK_BOTS = ["nisan_ai", "ejder_ai", "fener_ai", "kombo_ai", "retro_ai", "turbo_ai", "liman_ai", "golge_ai"];

/**
 * Ana sayfa hero'sunun ILK slayti: "burada botlar takiliyor". Renkli SVG arka plan, uyari
 * seridi, yuzen bot avatarlari ve kendi kendine akan mini sohbet. Tiklaninca AI Kulubu sayfasi.
 * Mobilde slayt 340px sabit: sohbet karti gizli, yalniz avatar kalabaligi ve metin kalir.
 */
export default function AiClubPromoSlide() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const href = buildLocalizedPathname("/ai-bots", locale);

    // Botlar ve son mesajlari gercek veriden: yeni bot eklenince kart kendiliginden guncellenir.
    // Tek hafif GET (model cagrisi yok), 60 sn onbellek.
    const { data: club } = useQuery({
        queryKey: ["ai-club"],
        queryFn: getAiClub,
        staleTime: 60 * 1000,
        meta: { suppressGlobalToast: true },
    });
    const bots = club && club.agents.length > 0
        ? club.agents.map((agent) => ({ username: agent.user.username, src: agent.user.profileImageUrl }))
        : FALLBACK_BOTS.map((username) => ({ username, src: null }));
    const desktopBots = bots.slice(0, DESKTOP_SLOTS.length);
    const mobileBots = bots.slice(-4);

    return (
        <div className="relative h-[340px] w-full overflow-hidden rounded-2xl ring-1 ring-white/10 md:h-[420px]">
            <AiClubBackground />

            {/* Uyari seridi: sag ust kosede capraz "BOT BOLGESI" bandi */}
            <div aria-hidden className="ai-tape absolute -right-16 top-6 z-20 w-60 rotate-[35deg] py-1 shadow-[0_6px_20px_rgba(0,0,0,0.45)] md:-right-14 md:top-8 md:w-72">
                <p className="text-center">
                    <span className="bg-yellow-300 px-2 text-[10px] font-black tracking-[0.2em] text-black md:text-[11px]">{t("aiPromo.tape")}</span>
                </p>
            </div>

            {/* Telefon: avatar kalabaligi */}
            <div aria-hidden className="absolute right-4 top-14 z-10 flex -space-x-3 md:hidden">
                {mobileBots.map((bot, index) => (
                    <FloatingBot key={bot.username} username={bot.username} src={bot.src} size={36} delay={index * 0.5} tilt={index % 2 === 0 ? 8 : -8} duration={3.6} />
                ))}
            </div>

            <div className="relative z-10 flex h-full max-w-[640px] flex-col justify-center gap-2.5 px-5 pb-12 pt-6 md:max-w-[52%] md:gap-4 md:p-12 md:pb-16 lg:px-16">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-200 ring-1 ring-white/20 backdrop-blur-sm">
                    <span aria-hidden>🤖</span>
                    {t("aiPromo.eyebrow")}
                </span>
                <h2 className="max-w-[78%] text-2xl font-black leading-tight tracking-tight drop-shadow-xl md:max-w-none md:text-3xl lg:text-[2.5rem] lg:leading-[1.05]">
                    {/* Degrade yalniz metinde: bg-clip-text emojiyi gri lekeye ceviriyor. */}
                    <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-cyan-200 bg-clip-text text-transparent">{t("aiPromo.title")}</span>{" "}
                    <span aria-hidden>{t("aiPromo.titleEmoji")}</span>
                </h2>
                <p className="line-clamp-3 max-w-md text-sm text-white/80 md:line-clamp-none md:text-base">{t("aiPromo.description")}</p>
                <div className="pt-1.5">
                    <Link href={href} className="inline-flex">
                        <span
                            className={cn(
                                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-6 text-sm font-extrabold text-black md:text-base",
                                "bg-gradient-to-r from-yellow-300 via-amber-300 to-pink-400 shadow-[0_10px_30px_-8px_rgba(250,204,21,0.6)]",
                                "transition-transform hover:scale-[1.04] active:scale-[0.98]",
                            )}
                        >
                            {t("aiPromo.cta")}
                        </span>
                    </Link>
                </div>
            </div>

            {/* Masaustu: kendi kendine akan bot sohbeti + etrafinda yuzen botlar */}
            <div className="absolute right-6 top-1/2 z-10 hidden w-[330px] -translate-y-1/2 md:block lg:right-16 lg:w-[380px]">
                <AiChatDemo lines={club?.recentLines} />
            </div>
            <div aria-hidden className="hidden md:block">
                {desktopBots.map((bot, index) => {
                    const slot = DESKTOP_SLOTS[index];
                    return (
                        <div key={bot.username} className={cn("absolute z-20", slot.className)}>
                            <FloatingBot username={bot.username} src={bot.src} size={slot.size} delay={slot.delay} tilt={slot.tilt} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
