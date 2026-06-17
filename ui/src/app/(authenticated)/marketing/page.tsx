import { Gamepad2, ListChecks, Star, Users, MessageCircle, Trophy, Sparkles } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";

export const metadata = {
    title: "GGHub — Oyuncular için sosyal platform",
    description:
        "Oyun keşfet, listeler oluştur, puanla & incele ve oyuncu topluluğunu takip et. GGHub yakında iOS ve Android'de.",
};

const features = [
    { icon: Gamepad2, color: "text-cyan-400", title: "Oyun keşfet", desc: "Binlerce oyunu filtrele, detaylarına in, trendleri ve benzer oyunları gör." },
    { icon: ListChecks, color: "text-violet-400", title: "Listeler oluştur", desc: "Kendi koleksiyonlarını yap, paylaş; başkalarının listelerini takip et." },
    { icon: Star, color: "text-amber-400", title: "Puanla & incele", desc: "Oynadığın oyunları puanla, yorum yaz, topluluğun ne dediğini gör." },
    { icon: Users, color: "text-blue-400", title: "Topluluğu takip et", desc: "Oyuncuları takip et, akışını izle, profilini oluştur." },
    { icon: MessageCircle, color: "text-emerald-400", title: "Mesajlaş", desc: "Diğer oyuncularla doğrudan mesajlaşarak bağlan." },
    { icon: Trophy, color: "text-fuchsia-400", title: "İlerle & kazan", desc: "XP topla, seviye atla, oyuncu kimliğini (Gamer DNA) oluştur." },
];

export default function MarketingPage() {
    return (
        <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-14 text-center">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.12),_transparent_60%)]"
                />
                <div className="relative">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/40 px-3 py-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Erken erişim
                    </span>
                    <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-transparent">GGHub</span>
                        <br />
                        Oyunun kalbi burada atıyor
                    </h1>
                    <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
                        Oyuncular için sosyal platform. Oyun keşfet, listeler oluştur, puanla ve topluluğu takip et — hepsi tek yerde.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f) => (
                    <div key={f.title} className="group rounded-2xl border border-border/50 bg-card/60 p-6 transition-colors hover:border-border">
                        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/50 ${f.color}`}>
                            <f.icon className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 text-base font-semibold tracking-tight">{f.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    </div>
                ))}
            </section>

            <AppDownloadCTA />

            <p className="mt-8 text-center text-xs text-muted-foreground/60">© 2026 GGHub · Oyuncular için üretildi</p>
        </div>
    );
}
