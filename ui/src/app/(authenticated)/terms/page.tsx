import {
    FileText,
    Handshake,
    Gamepad2,
    UserCog,
    ShieldAlert,
    MessageSquare,
    Flag,
    Copyright,
    Plug,
    AlertTriangle,
    LogOut,
    Scale,
    X,
} from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";

export const metadata = {
    title: "Kullanım Şartları | GGHub",
    description: "GGHub kullanım şartları ve hizmet koşulları",
};

export default function TermsPage() {
    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-12 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(34,211,238,0.12),_transparent_60%)]"
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/15 to-cyan-500/15 text-violet-400">
                            <FileText className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Kullanım Şartları</h1>
                        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                            GGHub topluluğunun adil, güvenli ve keyifli kalması için herkesin uyduğu kurallar. Platformu kullanarak bu şartları kabul etmiş olursun.
                        </p>
                        <p className="text-xs text-muted-foreground/70">Son güncelleme: 17 Haziran 2026</p>
                    </div>
                </section>

                {/* Sections */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card icon={Handshake} color="text-cyan-400" title="1. Taraflar ve Kabul">
                        <p>
                            Bu şartlar, GGHub platformuna erişen veya kayıt olan herkes için geçerlidir. Platformu kullanarak şartları okuduğunu, anladığını ve kabul
                            ettiğini beyan etmiş olursun. Şartlar zaman zaman güncellenebilir; üstteki tarihin değişmesi yeni sürümün yürürlükte olduğu anlamına gelir.
                        </p>
                    </Card>

                    <Card icon={Gamepad2} color="text-violet-400" title="2. Hizmetin Konusu">
                        <p>
                            GGHub; kullanıcıların oyun listeleri oluşturmasına, bunları paylaşmasına, diğer oyuncuları takip etmesine ve oyun odaklı sosyal etkileşim
                            kurmasına imkan veren çevrimiçi bir platformdur. Yeni özellikler eklenebilir veya mevcut özellikler değiştirilebilir.
                        </p>
                    </Card>

                    <Card icon={UserCog} color="text-amber-400" title="3. Üyelik ve Hesap Güvenliği">
                        <List
                            items={[
                                "Kayıt olurken doğru ve güncel bilgi vermekle yükümlüsün.",
                                "Hesap bilgilerinin gizliliğini korumak senin sorumluluğundadır.",
                                "Hesabın üzerinden yapılan tüm işlemlerden sen sorumlu olursun.",
                                "Yetkisiz bir kullanım fark edersen makul sürede bize bildirmelisin.",
                                "Sahte hesaplar askıya alınabilir veya kalıcı olarak kapatılabilir.",
                            ]}
                        />
                    </Card>

                    <Card icon={ShieldAlert} color="text-rose-400" title="4. Yasaklı Davranışlar">
                        <p className="mb-3">Platformu hukuka, kamu düzenine ve bu şartlara aykırı kullanamazsın. Aşağıdakiler kesinlikle yasaktır:</p>
                        <DenyList
                            items={[
                                "Hakaret, tehdit, taciz ve nefret söylemi içeren paylaşımlar",
                                "Yasadışı, telif hakkını veya başkalarının gizliliğini ihlal eden içerik",
                                "Spam, otomatik mesaj veya yanıltıcı yönlendirme",
                                "Platformun güvenliğini test etme veya zayıflatma girişimleri",
                                "Başka bir kullanıcıyı izinsiz kullanma veya taklit etme",
                            ]}
                        />
                    </Card>

                    <Card icon={MessageSquare} color="text-blue-400" title="5. Kullanıcı İçerikleri">
                        <p>
                            Paylaştığın listeler, yorumlar, profil bilgileri ve diğer içeriklerin sorumluluğu sana aittir ve bunların üçüncü kişilerin haklarını ihlal
                            etmediğini kabul edersin. İçerik yükleyerek, bunun hizmetin sunulması amacıyla görüntülenmesine ve saklanmasına izin verirsin; bu izin içeriğin
                            mülkiyetinin GGHub&apos;a geçtiği anlamına gelmez.
                        </p>
                    </Card>

                    <Card icon={Flag} color="text-orange-400" title="6. İçerik Moderasyonu ve Raporlama">
                        <p className="mb-3">
                            GGHub, uygunsuz içeriğe ve kötü niyetli davranışa karşı sıfır tolerans uygular. Topluluğu güvende tutmak için:
                        </p>
                        <List
                            items={[
                                "Her içeriği ve profili menüden Raporla seçeneğiyle bildirebilirsin.",
                                "Rahatsız eden kullanıcıları engelleyebilirsin.",
                                "Bildirimler ekibimizce incelenir; ihlal eden içerik ve hesaplara karşı 24 saat içinde işlem yapılır.",
                                "Kurallara aykırı içerik bildirim yapılmadan da kaldırılabilir.",
                            ]}
                        />
                    </Card>

                    <Card icon={Copyright} color="text-fuchsia-400" title="7. Fikri Mülkiyet Hakları">
                        <p>
                            Platformun tasarımı, adı, logosu, yazılımı ve görsel unsurları GGHub&apos;a aittir. Yazılı izin olmadan kopyalanamaz, satılamaz, yeniden
                            dağıtılamaz veya türev çalışmalar yapılamaz.
                        </p>
                    </Card>

                    <Card icon={Plug} color="text-emerald-400" title="8. Üçüncü Taraf Hizmetler">
                        <p>
                            Platform bazı özellikler için üçüncü taraf servislerden (oyun katalogları, kimlik doğrulama hizmetleri gibi) veri alabilir. Bu servislerin
                            içerik ve sürekliliğinden ilgili sağlayıcı sorumludur.
                        </p>
                    </Card>

                    <Card icon={AlertTriangle} color="text-amber-400" title="9. Sorumluluğun Sınırlandırılması">
                        <p>
                            Platform olduğu gibi sunulur. Erişim kesintileri, bakım çalışmaları, teknik arızalar veya veri kaybı gibi durumlardan doğan dolaylı zararlardan
                            GGHub sorumlu tutulamaz. Platformu kendi sorumluluğunda kullanırsın.
                        </p>
                    </Card>

                    <Card icon={LogOut} color="text-teal-400" title="10. Fesih ve Hesap Kapatma">
                        <p>
                            Dilediğin zaman hesabını uygulama içinden sonlandırabilirsin. GGHub da topluluk kurallarını ihlal eden, güvenlik riski oluşturan veya kötü
                            niyetli olduğu tespit edilen hesapları sonlandırma hakkına sahiptir.
                        </p>
                    </Card>

                    {/* Uygulanacak hukuk, full width */}
                    <div className="md:col-span-2 rounded-2xl border border-border/50 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 p-6">
                        <div className="flex items-start gap-4">
                            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/50 text-violet-400">
                                <Scale className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">11. Uygulanacak Hukuk ve Yetki</h2>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                    Bu kullanım şartları Türk Hukukuna tabidir. Uyuşmazlıkların çözümünde 6100 sayılı Hukuk Muhakemeleri Kanunu&apos;nun genel yetki
                                    kuralları uygulanır.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <AppDownloadCTA />
            </div>
        </div>
    );
}

function Card({
    icon: Icon,
    color,
    title,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-border/50 bg-card/60 p-6 transition-colors hover:border-border">
            <div className="flex items-center gap-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50 ${color}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            </div>
            <div className="mt-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
        </section>
    );
}

function List({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function DenyList({ items }: { items: string[] }) {
    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400/80" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}
