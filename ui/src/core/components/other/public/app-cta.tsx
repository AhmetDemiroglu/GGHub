import { Apple, Play, Mail, ArrowUpRight } from "lucide-react";

/**
 * Shared "download the app + contact" block used across the public legal/marketing pages.
 * Store buttons are intentionally passive (apps not yet published) — shown with a "Yakında" badge.
 */
export function AppDownloadCTA() {
    return (
        <section className="mt-10 grid gap-4 md:grid-cols-2">
            {/* Download card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 blur-2xl"
                />
                <h3 className="text-lg font-semibold tracking-tight">Uygulamayı indir</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    GGHub yakında iOS ve Android&apos;de. Mağaza linkleri çok yakında burada.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <StoreButton icon={<Apple className="h-5 w-5" />} label="App Store" />
                    <StoreButton icon={<Play className="h-5 w-5" />} label="Google Play" />
                </div>
            </div>

            {/* Contact card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-6">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-2xl"
                />
                <h3 className="text-lg font-semibold tracking-tight">İletişime geç</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Soruların, geri bildirimin veya iş birliği için bize yaz.
                </p>
                <a
                    href="mailto:info@gghub.social"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm font-medium transition-colors hover:border-cyan-400/60 hover:text-cyan-400"
                >
                    <Mail className="h-4 w-4" />
                    info@gghub.social
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                </a>
            </div>
        </section>
    );
}

function StoreButton({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="relative inline-flex flex-1 cursor-default items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-black/80 px-5 py-3 text-white opacity-90">
            {icon}
            <span className="text-sm font-semibold">{label}</span>
            <span className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                Yakında
            </span>
        </div>
    );
}
