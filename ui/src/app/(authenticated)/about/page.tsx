import Image from "next/image";
import { Gamepad2, Users, Share2, Sparkles, Compass, ListChecks } from "lucide-react";
import logoSrc from "@core/assets/logo.png";
import { The_Girl_Next_Door } from "next/font/google";

const font = The_Girl_Next_Door({
    subsets: ["latin"],
    weight: ["400"],
});

export const metadata = {
    title: "Hakkımızda | GGHub",
    description: "GGHub, oyun severleri bir araya getiren, keşfetmeyi kolaylaştıran ve paylaşmayı teşvik eden sosyal platform.",
};

export default function AboutPage() {
    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 text-center pt-2">
                    <div className="inline-flex items-center gap-2 bg-muted/10 border border-border/40 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Gamepad2 className="h-4 w-4" />
                        </span>
                        Oyun Tutkunları İçin
                    </div>
                    <div className="flex items-center gap-3">
                        <Image src={logoSrc} alt="GGHub Logo" title="'Good Game'" width={42} height={42} className="rounded-md" />
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">GGHub Nedir?</h1>
                    </div>
                    <p className={`${font.className} text-lg md:text-2xl text-foreground/80 leading-relaxed`}>
                        oyun severleri bir araya getiren, <span className="text-fuchsia-600/90 drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]">keşfetmeyi</span> kolaylaştıran ve
                        <span className="text-fuchsia-600/90 drop-shadow-[0_0_6px_rgba(34,211,238,0.35)]">paylaşmayı</span> teşvik eden sosyal platform
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Compass className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">Keşfet</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">Farklı platformlarda gördüğün oyunları tek yerde topla ve benzer oyunları kolayca bul.</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <ListChecks className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">Listele</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">Oynadığın, oynayacağın ve bitirdiğin oyunları listelere ayır, profilini oyun geçmişine dönüştür.</p>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-background/30 p-5 flex flex-col gap-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                            <Users className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-semibold tracking-tight">Bağlan</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">Diğer oyuncuları takip et, listelerine bak, benzer oyun zevkine sahip kişileri hızlıca bul, sohbet et.</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/40 p-5 space-y-5">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight flex items-center gap-2">
                        Neden GGHub?
                        <Sparkles className="h-4 w-4 text-primary" />
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Çoğu platform oyunu gösterir, oyuncuyu değil. GGHub ise tam tersini yapar: önce oyuncuyu, sonra oyunu düşünür. “Kim ne oynuyor?”, “Bu kişi hangi oyunları bitirdi?”, “Bizim
                        arkadaş grubu şu oyunu oynuyor mu?” gibi sorulara tek ekrandan cevap vermek için tasarlandı.
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Share2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Sosyal katman çekirdekte</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">Takip, yorum, bildirim, paylaşım. GGHub sadece oyun listesi tutmaz, oyuncular arasında akış yaratır.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Gamepad2 className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Oyun merkezli profil</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">Profil sadece fotoğraf ve bio değil; oynadığın, bitirdiğin ve beklemeye aldığın oyunları da yansıtır.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Benzer oyuncuyu bul</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">Aynı türleri, aynı serileri ve benzer listeleri seven oyuncuları keşfetmek kolaydır.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                                <Compass className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Keşif için tasarlandı</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">Sadece sahip olduklarını değil, bir sonraki oynayacağın oyunu da görmeyi kolaylaştırır.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/20 p-5 space-y-5">
                    <h2 className="text-base md:text-lg font-semibold tracking-tight">GGHub nasıl çalışır?</h2>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Adım 1</p>
                            <p className="text-sm font-semibold">Oyunlarını ekle</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">Şu an oynadıklarını ve planladıklarını listele.</p>
                        </div>
                        <div className="hidden md:flex h-10 w-10 rounded-full border border-border/40 items-center justify-center text-muted-foreground/70 shrink-0">→</div>
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Adım 2</p>
                            <p className="text-sm font-semibold">Görünür yap</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">Listelerin açık olduğunda diğer oyuncular seni keşfedebilir.</p>
                        </div>
                        <div className="hidden md:flex h-10 w-10 rounded-full border border-border/40 items-center justify-center text-muted-foreground/70 shrink-0">→</div>
                        <div className="flex-1 rounded-xl bg-muted/5 border border-border/30 p-4 space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Adım 3</p>
                            <p className="text-sm font-semibold">Oyuncuları takip et</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">Benzer zevklere sahip profilleri takip ederek akışını kişiselleştir.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
