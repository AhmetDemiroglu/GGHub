"use client";

import { Gamepad2, ListChecks, Star, Users, MessageCircle, Trophy, Sparkles } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";
import { useCurrentLocale } from "@/core/contexts/locale-context";

const ICONS = [Gamepad2, ListChecks, Star, Users, MessageCircle, Trophy];
const COLORS = ["text-cyan-400", "text-violet-400", "text-amber-400", "text-blue-400", "text-emerald-400", "text-fuchsia-400"];

const COPY = {
    "en-US": {
        badge: "Early access",
        titleLine: "The heart of gaming beats here",
        subtitle: "A social platform for gamers. Discover games, build lists, rate, and follow the community. All in one place.",
        footer: "© 2026 GGHub. Built for gamers.",
        features: [
            { title: "Discover games", desc: "Filter thousands of titles, dive into details, and see trends and similar games." },
            { title: "Build lists", desc: "Create your own collections and share them; follow other players' lists." },
            { title: "Rate and review", desc: "Score the games you play, write reviews, and see what the community thinks." },
            { title: "Follow the community", desc: "Follow players, watch your feed, and build your profile." },
            { title: "Message players", desc: "Connect directly with other gamers." },
            { title: "Level up", desc: "Earn XP, climb levels, and shape your Gamer DNA." },
        ],
    },
    tr: {
        badge: "Erken erişim",
        titleLine: "Oyunun kalbi burada atıyor",
        subtitle: "Oyuncular için sosyal platform. Oyun keşfet, listeler oluştur, puanla ve topluluğu takip et. Hepsi tek yerde.",
        footer: "© 2026 GGHub. Oyuncular için üretildi.",
        features: [
            { title: "Oyun keşfet", desc: "Binlerce oyunu filtrele, detaylarına in, trendleri ve benzer oyunları gör." },
            { title: "Listeler oluştur", desc: "Kendi koleksiyonlarını yap, paylaş; başkalarının listelerini takip et." },
            { title: "Puanla ve incele", desc: "Oynadığın oyunları puanla, yorum yaz, topluluğun ne dediğini gör." },
            { title: "Topluluğu takip et", desc: "Oyuncuları takip et, akışını izle, profilini oluştur." },
            { title: "Mesajlaş", desc: "Diğer oyuncularla doğrudan mesajlaşarak bağlan." },
            { title: "İlerle ve kazan", desc: "XP topla, seviye atla, oyuncu kimliğini (Gamer DNA) oluştur." },
        ],
    },
} as const;

export default function MarketingPage() {
    const locale = useCurrentLocale();
    const t = COPY[locale] ?? COPY["en-US"];

    return (
        <div className="relative w-full p-5">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-16 text-center md:py-20">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.12),_transparent_60%)]"
                />
                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/40 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> {t.badge}
                    </span>
                    <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-transparent">GGHub</span>
                        <br />
                        {t.titleLine}
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">{t.subtitle}</p>
                </div>
            </section>

            {/* Features */}
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {t.features.map((f, i) => {
                    const Icon = ICONS[i];
                    return (
                        <div key={f.title} className="group rounded-2xl border border-border/50 bg-card/60 p-6 transition-colors hover:border-border">
                            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/50 ${COLORS[i]}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                        </div>
                    );
                })}
            </section>

            <AppDownloadCTA />

            <p className="mt-8 text-center text-xs text-muted-foreground/60">{t.footer}</p>
        </div>
    );
}
