import type { AppLocale } from "@/i18n/config";

/**
 * Destek sayfasinin SSS metinleri. Ayri, 'use client' OLMAYAN dosya: sayfa (sunucu) FAQPage JSON-LD'yi,
 * gorunum (istemci) ekrani ayni kaynaktan uretir. Yeni soru eklerken YALNIZ burasi degisir.
 */
export const SUPPORT_COPY = {
    "en-US": {
        title: "Support",
        subtitle: "The answers you are looking for are here. If you cannot find them, do not hesitate to write to us.",
        faqs: [
            {
                q: "What is GGHub?",
                a: "GGHub is a social platform for gamers. You discover games, create lists, rate and review, and connect with the community.",
            },
            {
                q: "Can I use it without signing in?",
                a: "Yes. As a guest you can view games, lists, and profiles. Rating, reviewing, creating lists, following, and messaging require a free account.",
            },
            {
                q: "Can I sign in with Google or Apple?",
                a: "Yes. You can continue with your Google or Apple account in one tap from the sign-in and registration screens.",
            },
            {
                q: "I forgot my password, what should I do?",
                a: "Tap the Forgot password link on the sign-in screen; a reset code is sent to your email address.",
            },
            {
                q: "How do I delete my account?",
                a: "Go to Profile, Settings, Danger Zone, Delete Account. Your account and data are permanently deleted.",
            },
            {
                q: "How do I report inappropriate content or a user?",
                a: "Use the Report option from the content or profile menu, or block the user. Reports are reviewed by our team.",
            },
        ],
    },
    tr: {
        title: "Destek",
        subtitle: "Aklındaki soruların cevabı burada. Bulamazsan bize yazmaktan çekinme.",
        faqs: [
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
                a: "Giriş ekranındaki Şifremi unuttum bağlantısına dokun; e-posta adresine bir sıfırlama kodu gönderilir.",
            },
            {
                q: "Hesabımı nasıl silerim?",
                a: "Profil, Ayarlar, Tehlikeli Alan, Hesabı Sil adımlarını izle. Hesabın ve verilerin kalıcı olarak silinir.",
            },
            {
                q: "Uygunsuz bir içerik veya kullanıcıyı nasıl bildiririm?",
                a: "İlgili içeriğin/profilin menüsünden Raporla seçeneğini kullan ya da kullanıcıyı engelle. Bildirimler ekibimizce değerlendirilir.",
            },
        ],
    },
} as const satisfies Record<AppLocale, unknown>;
