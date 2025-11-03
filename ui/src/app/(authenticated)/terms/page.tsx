import { FileText } from "lucide-react";

export const metadata = {
    title: "Kullanım Şartları | GGHub",
    description: "GGHub kullanım şartları ve hizmet koşulları",
};

export default function TermsPage() {
    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 text-center pt-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="h-8 w-8" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Kullanım Şartları</h1>
                    <p className="text-muted-foreground text-sm">Son güncelleme: 03 Kasım 2025</p>
                </div>

                <div className="rounded-2xl border border-border/40 bg-background/30 p-8 space-y-6">
                    {/* 1. Taraflar ve Kabul */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">1. Taraflar ve Kabul</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Bu kullanım şartları (“Şartlar”), GGHub platformuna (“Platform”) erişen veya kayıt olan herkes (“Kullanıcı”) için geçerlidir. Platformu kullanarak bu şartları okuduğunuzu,
                            anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz. Şartları kabul etmiyorsanız Platform’u kullanmamalısınız.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            GGHub bu şartları zaman zaman güncelleyebilir. Sayfanın en üstündeki tarihin değişmesi, şartların güncellendiği anlamına gelir. Platformu kullanmaya devam etmeniz
                            güncellenen şartları kabul ettiğiniz anlamına gelir.
                        </p>
                    </section>

                    {/* 2. Hizmetin Konusu */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">2. Hizmetin Konusu</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform; kullanıcıların oyunlarını listelemesine, bu listeleri paylaşmasına, diğer kullanıcıları takip etmesine ve oyun odaklı sosyal etkileşim kurmasına imkân veren
                            çevrimiçi bir hizmettir. GGHub dilediği zaman yeni özellikler ekleyebilir veya mevcut özellikleri değiştirebilir.
                        </p>
                    </section>

                    {/* 3. Üyelik ve Hesap Güvenliği */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">3. Üyelik ve Hesap Güvenliği</h2>
                        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                            <li>- Kayıt olurken doğru ve güncel bilgi vermekle yükümlüsünüz.</li>
                            <li>- Hesap bilgilerinizin gizliliğini korumak sizin sorumluluğunuzdadır.</li>
                            <li>- Hesabınız üzerinden yapılan tüm işlemlerden siz sorumlu olursunuz.</li>
                            <li>- Yetkisiz bir kullanım tespit ederseniz makul sürede bize bildirmelisiniz.</li>
                            <li>- Sahte hesap açıldığı tespit edilirse GGHub ilgili hesabı askıya alma veya kalıcı olarak kapatma hakkını saklı tutar.</li>
                        </ul>
                    </section>

                    {/* 4. Platformun Kullanımı */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">4. Platformun Kullanımı</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform’u yürürlükteki mevzuata, kamu düzenine ve bu şartlara aykırı şekilde kullanamazsınız. Aşağıdaki davranışlar kesin olarak yasaktır:
                        </p>
                        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                            <li>- Hakaret, tehdit, aşağılama, nefret söylemi ve taciz içeren paylaşımlar yapmak,</li>
                            <li>- Yasadışı, telif hakkını ihlal eden veya başkalarının gizliliğini ihlal eden içerik paylaşmak,</li>
                            <li>- Spam, otomatik mesaj veya yanıltıcı yönlendirme yapmak,</li>
                            <li>- Platform’un güvenliğini test etmeye veya zayıflatmaya çalışmak,</li>
                            <li>- Başka bir kullanıcının hesabını izinsiz kullanmak veya taklit etmek.</li>
                        </ul>
                    </section>

                    {/* 5. Kullanıcı İçerikleri */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">5. Kullanıcı İçerikleri</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform’da paylaştığınız oyun listeleri, yorumlar, profil bilgileri ve diğer tüm içeriklerin sorumluluğu size aittir. Bu içeriklerin üçüncü kişilerin haklarını ihlal
                            etmediğini kabul etmiş olursunuz.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            GGHub, topluluk kurallarına aykırı gördüğü içerikleri veya hesapları geçici ya da kalıcı olarak kaldırabilir. Bu durum size ayrıca bildirilmek zorunda değildir.
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform’a içerik yükleyerek, bu içeriğin hizmetin sunulması amacıyla Platform tarafından görüntülenmesine, saklanmasına ve çoğaltılmasına izin vermiş olursunuz. Bu izin
                            içeriğin mülkiyetinin GGHub’a geçtiği anlamına gelmez.
                        </p>
                    </section>

                    {/* 6. Fikri Mülkiyet */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">6. Fikri Mülkiyet Hakları</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform’un tasarımı, adı, logosu, yazılımı ve görsel unsurları GGHub’a aittir. Yazılı izin olmadan kopyalanamaz, satılamaz, yeniden dağıtılamaz veya türev çalışmalar
                            yapılamaz.
                        </p>
                    </section>

                    {/* 7. Üçüncü Taraf Hizmetler */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">7. Üçüncü Taraf Hizmetler</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform bazı özellikler için üçüncü taraf servislerden (örneğin oyun katalogları veya kimlik doğrulama hizmetleri) veri alabilir. Bu servislerin içerik ve sürekliliğinden
                            ilgili servis sağlayıcı sorumludur.
                        </p>
                    </section>

                    {/* 8. Sorumluluğun Sınırlandırılması */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">8. Sorumluluğun Sınırlandırılması</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Platform “olduğu gibi” sunulur. Erişim kesintileri, bakım çalışmaları, teknik arızalar veya veri kaybı gibi durumlardan doğan dolaylı zararlardan GGHub sorumlu tutulamaz.
                            Platformu kendi sorumluluğunuzda kullanırsınız.
                        </p>
                    </section>

                    {/* 9. Fesih */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">9. Fesih ve Hesap Kapatma</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Kullanıcı dilediği zaman hesabını sonlandırabilir. GGHub da topluluk kurallarını ihlal eden, güvenlik riski oluşturan veya kötü niyetli olduğu tespit edilen hesapları
                            sonlandırma hakkına sahiptir.
                        </p>
                    </section>

                    {/* 10. Uygulanacak Hukuk */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">10. Uygulanacak Hukuk ve Yetki</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Bu kullanım şartları Türk Hukukuna tabidir. Uyuşmazlıkların çözümünde 6100 sayılı Hukuk Muhakemeleri Kanunu’nun genel yetki kuralları uygulanır.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
