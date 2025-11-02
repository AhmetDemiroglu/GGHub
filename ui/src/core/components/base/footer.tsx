import Image from "next/image";
import logoSrc2 from "@core/assets/logo2.png";
import Link from "next/link";
import { Mail } from "lucide-react";
import { FaXTwitter, FaInstagram } from "react-icons/fa6";
import { The_Girl_Next_Door } from "next/font/google";

const font = The_Girl_Next_Door({
    subsets: ["latin"],
    weight: ["400"],
});
export function Footer() {
    return (
        <footer className="border-t bg-background mt-auto">
            <div className="w-full h-full">
                <div className="space-y-4">
                    <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-10 pt-10 pb-6">
                        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex flex-col gap-4 max-w-sm">
                                <Link href="/" className="flex items-center gap-2.5 w-fit cursor-pointer group">
                                    <Image src={logoSrc2} alt="GGHub Logo" width={100} className="transition-transform group-hover:scale-105" />
                                </Link>
                                <p className={`text-lg font-medium text-foreground/40 tracking-tight ${font.className}`}>
                                    Oyun tutkunu <span className="text-fuchsia-600/90 drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]">toplulukla</span> <br></br>birleştiren platform.
                                </p>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/30">Sürüm 1.0.0</p>
                            </div>
                            <div className="grid grid-cols-2 gap-10 md:gap-14 lg:gap-16">
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">Şirket</h3>
                                    <div className="flex flex-col gap-2.5">
                                        <Link href="/about" className="text-sm text-foreground/80 hover:text-primary transition-colors w-fit">
                                            Hakkımızda
                                        </Link>
                                        <Link href="/privacy" className="text-sm text-foreground/80 hover:text-primary transition-colors w-fit">
                                            Gizlilik Politikası
                                        </Link>
                                        <Link href="/terms" className="text-sm text-foreground/80 hover:text-primary transition-colors w-fit">
                                            Kullanım Şartları
                                        </Link>
                                        <a
                                            href="mailto:info@gghub.social"
                                            title="info@gghub.social"
                                            className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary transition-colors w-fit"
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            İletişim
                                        </a>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground/60">Topluluk</h3>
                                    <div className="flex gap-3">
                                        <button
                                            disabled
                                            className="p-2.5 rounded-lg bg-muted/40 border border-border/20 hover:bg-muted/70 transition-colors cursor-not-allowed opacity-60"
                                            title="Yakında"
                                        >
                                            <FaXTwitter className="w-4 h-4" />
                                        </button>
                                        <button
                                            disabled
                                            className="p-2.5 rounded-lg bg-muted/40 border border-border/20 hover:bg-muted/70 transition-colors cursor-not-allowed opacity-60"
                                            title="Yakında"
                                        >
                                            <FaInstagram className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground/60 leading-relaxed">Resmî hesaplar yakında aktif olacak. Şimdilik e-posta üzerinden ulaşabilirsin.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-border/40">
                        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-10 pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground/60 text-center md:text-left">© 2025 GGHub. Tüm hakları saklıdır.</p>
                            <p className="text-[11px] text-muted-foreground/40">Oyun topluluğunuz · Made for players</p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
