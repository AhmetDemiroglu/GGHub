import { LifeBuoy } from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";

export const metadata = {
    title: "Destek | GGHub",
    description: "GGHub yardım merkezi: sık sorulan sorular ve iletişim.",
};

const faqs = [
    {
        q: "GGHub nedir?",
        a: "GGHub, oyuncular için bir sosyal platformdur. Oyun keşfeder, listeler oluşturur, puan/yorum verir ve toplulukla bağlanırsın.",
    },
    {
        q: "Giriş yapmadan kullanabilir miyim?",
        a: "Evet. Misafir olarak oyunları, listeleri ve profilleri görüntüleyebilirsin. Puanlama, yorum, liste oluşturma, takip ve mesaj gibi özellikler için ücretsiz bir hesap gerekir.",
    },
    {
        q: "Google veya Apple ile giriş yapabilir miyim?",
        a: "Evet. Giriş ve kayıt ekranlarından Google ya da Apple hesabınla tek dokunuşla devam edebilirsin.",
    },
    {
        q: "Şifremi unuttum, ne yapmalıyım?",
        a: "Giriş ekranındaki “Şifremi unuttum” bağlantısına dokun; e-posta adresine bir sıfırlama kodu gönderilir.",
    },
    {
        q: "Hesabımı nasıl silerim?",
        a: "Profil → Ayarlar → Tehlikeli Alan → “Hesabı Sil” adımlarını izle. Hesabın ve verilerin kalıcı olarak silinir.",
    },
    {
        q: "Uygunsuz bir içerik veya kullanıcıyı nasıl bildiririm?",
        a: "İlgili içeriğin/profilin menüsünden “Raporla” seçeneğini kullan ya da kullanıcıyı engelle. Bildirimler ekibimizce değerlendirilir.",
    },
];

export default function SupportPage() {
    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <div className="flex flex-col items-center gap-4 pt-2 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-400">
                    <LifeBuoy className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Destek</h1>
                <p className="max-w-md text-sm text-muted-foreground">
                    Aklındaki soruların cevabı burada. Bulamazsan bize yazmaktan çekinme.
                </p>
            </div>

            <div className="mt-8 space-y-3">
                {faqs.map((item) => (
                    <div key={item.q} className="rounded-2xl border border-border/50 bg-card/60 p-5">
                        <h2 className="text-base font-semibold tracking-tight">{item.q}</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                    </div>
                ))}
            </div>

            <AppDownloadCTA />

            <p className="mt-8 text-center text-xs text-muted-foreground/60">© 2026 GGHub · Oyuncular için üretildi</p>
        </div>
    );
}
