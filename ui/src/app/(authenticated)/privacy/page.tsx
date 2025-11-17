import { Shield, Mail } from "lucide-react";

export const metadata = {
    title: "Gizlilik Politikası | GGHub",
    description: "GGHub gizlilik politikası ve veri koruma uygulamaları",
};

export default function PrivacyPage() {
    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 text-center pt-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Shield className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Gizlilik Politikası</h1>
                    <p className="text-muted-foreground text-sm">Son güncelleme: 03 Kasım 2025</p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-8 space-y-6">
                    {/* 1. Amaç */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">1. Amaç</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Bu gizlilik politikası, GGHub platformunu kullanırken paylaştığınız bilgilerin hangi amaçlarla ve nasıl işlendiğini açıklamak için hazırlanmıştır. Kişisel verilerinizin
                            gizliliği ve güvenliği bizim için önemlidir.
                        </p>
                    </section>

                    {/* 2. Toplanan Veriler */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">2. Toplanan Veriler</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">Platformu kullandığınızda aşağıdaki veri türleri toplanabilir:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                            <li>- Hesap bilgileri (kullanıcı adı, e-posta, profil bilgileri)</li>
                            <li>- Kullanım verileri (oluşturulan listeler, takip edilen kullanıcılar, yorumlar)</li>
                            <li>- Teknik veriler (IP adresi, tarayıcı türü, cihaz bilgisi, oturum zamanı)</li>
                            <li>- Çerez verileri (oturumun açık kalması ve tercihlerin hatırlanması için)</li>
                        </ul>
                    </section>

                    {/* 3. İşleme Amaçları */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">3. Verilerin İşlenme Amaçları</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">Toplanan veriler aşağıdaki amaçlarla işlenir:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                            <li>- Üyelik ve giriş süreçlerini yürütmek</li>
                            <li>- Oyun listesi, takip, yorum ve bildirim gibi özellikleri sunmak</li>
                            <li>- Hesabınızın güvenliğini sağlamak</li>
                            <li>- Platform performansını izlemek ve geliştirmek</li>
                            <li>- Yasal yükümlülükleri yerine getirmek</li>
                        </ul>
                    </section>

                    {/* 4. Çerezler */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">4. Çerezler (Cookies)</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            GGHub, oturumunuzu açık tutmak, tercihlerinizi hatırlamak ve kullanım istatistikleri oluşturmak için çerezler kullanır. Tarayıcı ayarlarınızdan çerezleri
                            engelleyebilirsiniz; ancak bazı özellikler kısıtlanabilir.
                        </p>
                    </section>

                    {/* 5. Verilerin Paylaşılması */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">5. Verilerin Paylaşılması</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Kişisel verileriniz üçüncü kişilere satılmaz. Verileriniz sadece hizmetin sunulması için gerekli olan altyapı sağlayıcılarıyla (barındırma hizmeti, e-posta servisi vb.)
                            paylaşılabilir. Yasal bir talep olması halinde resmi mercilerle paylaşım yapılabilir.
                        </p>
                    </section>

                    {/* 6. Saklama Süresi */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">6. Veri Saklama Süresi</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Hesabınız aktif olduğu sürece hesabın çalışması için gerekli veriler saklanır. Hesabınızı sildiğinizde veya silinmesini istediğinizde, yasal olarak saklanması gereken
                            kayıtlar hariç olmak üzere veriler makul süre içinde silinir.
                        </p>
                    </section>

                    {/* 7. Haklarınız */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">7. Kullanıcı Hakları</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">Aşağıdaki konularda talepte bulunabilirsiniz:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                            <li>- Hakkınızda hangi verilerin tutulduğunu öğrenme</li>
                            <li>- Yanlış veya eksik verilerin düzeltilmesini isteme</li>
                            <li>- Hesabınızın ve verilerinizin silinmesini talep etme</li>
                            <li>- Verilerinizin hangi amaçlarla kullanıldığını öğrenme</li>
                        </ul>
                        <p className="text-sm text-muted-foreground leading-relaxed">Bu talepler için aşağıdaki e-posta adresine başvurabilirsiniz.</p>
                    </section>

                    {/* 8. Güvenlik */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">8. Güvenlik</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Verilerinizin yetkisiz erişime karşı korunması için makul teknik ve idari tedbirler uygulanır. Ancak internet üzerinden yapılan hiçbir aktarımın tamamen güvenli olduğu
                            garanti edilemez.
                        </p>
                    </section>

                    {/* 9. Değişiklikler */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">9. Politika Değişiklikleri</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Bu gizlilik politikası zaman zaman güncellenebilir. Sayfanın en üstündeki tarihin değişmesi, yeni sürümün yürürlükte olduğu anlamına gelir.
                        </p>
                    </section>

                    {/* 10. İletişim */}
                    <section className="space-y-2 pt-2 border-t border-border/40">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Gizlilik ile ilgili sorularınız için
                            <span className="mx-2">
                                <a href="mailto:info@gghub.social" className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer font-medium">
                                    <Mail className="w-3.5 h-3.5" /> info@gghub.social
                                </a>
                            </span>
                            adresine e-posta gönderebilirsiniz.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
