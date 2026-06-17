import {
    Shield,
    Info,
    Database,
    Target,
    Cookie,
    Share2,
    Clock,
    UserCheck,
    Lock,
    RefreshCw,
    Mail,
    Check,
} from "lucide-react";
import { AppDownloadCTA } from "@core/components/other/public/app-cta";

export const metadata = {
    title: "Gizlilik Politikası | GGHub",
    description: "GGHub gizlilik politikası ve veri koruma uygulamaları",
};

export default function PrivacyPage() {
    return (
        <div className="w-full h-full p-5">
            <div className="space-y-6">
                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/60 px-6 py-12 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(139,92,246,0.12),_transparent_60%)]"
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-cyan-400">
                            <Shield className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Gizlilik Politikası</h1>
                        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                            Hangi verileri, neden ve nasıl işlediğimizi açık bir dille anlatıyoruz. Verilerini satmıyor, sadece hizmeti sunmak için kullanıyoruz.
                        </p>
                        <p className="text-xs text-muted-foreground/70">Son güncelleme: 17 Haziran 2026</p>
                    </div>
                </section>

                {/* Sections */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card icon={Info} color="text-cyan-400" title="1. Amaç">
                        <p>
                            Bu politika, GGHub platformunu kullanırken paylaştığın bilgilerin hangi amaçlarla ve nasıl işlendiğini açıklar. Kişisel verilerinin gizliliği
                            ve güvenliği bizim için önceliklidir.
                        </p>
                    </Card>

                    <Card icon={Database} color="text-violet-400" title="2. Toplanan Veriler">
                        <p className="mb-3">Platformu kullandığında aşağıdaki veri türleri toplanabilir:</p>
                        <List
                            items={[
                                "Hesap bilgileri: kullanıcı adı, e-posta, profil bilgileri",
                                "Sosyal giriş bilgileri: Google veya Apple ile giriş yaptığında ad ve e-posta",
                                "Kullanım verileri: oluşturulan listeler, takipler, puanlar ve yorumlar",
                                "Teknik veriler: IP adresi, cihaz ve tarayıcı bilgisi, oturum zamanı",
                                "Çerez verileri: oturumun açık kalması ve tercihlerin hatırlanması için",
                            ]}
                        />
                    </Card>

                    <Card icon={Target} color="text-amber-400" title="3. Verilerin İşlenme Amaçları">
                        <List
                            items={[
                                "Üyelik ve giriş süreçlerini yürütmek",
                                "Liste, takip, puanlama, yorum ve bildirim özelliklerini sunmak",
                                "Hesabının güvenliğini sağlamak",
                                "Platform performansını izlemek ve geliştirmek",
                                "Yasal yükümlülükleri yerine getirmek",
                            ]}
                        />
                    </Card>

                    <Card icon={Cookie} color="text-orange-400" title="4. Çerezler">
                        <p>
                            GGHub; oturumunu açık tutmak, tercihlerini hatırlamak ve kullanım istatistiği oluşturmak için çerezler kullanır. Tarayıcı ayarlarından
                            çerezleri engelleyebilirsin; ancak bazı özellikler kısıtlanabilir.
                        </p>
                    </Card>

                    <Card icon={Share2} color="text-blue-400" title="5. Verilerin Paylaşılması">
                        <p>
                            Kişisel verilerin üçüncü kişilere satılmaz. Veriler yalnızca hizmetin sunulması için gerekli altyapı sağlayıcılarıyla (barındırma, e-posta,
                            kimlik doğrulama servisleri gibi) paylaşılabilir. Yasal bir talep olması halinde resmi mercilerle paylaşım yapılabilir.
                        </p>
                    </Card>

                    <Card icon={Clock} color="text-emerald-400" title="6. Veri Saklama Süresi">
                        <p>
                            Hesabın aktif olduğu sürece, hesabın çalışması için gerekli veriler saklanır. Hesabını sildiğinde, yasal olarak saklanması gereken kayıtlar
                            hariç olmak üzere verilerin makul süre içinde kalıcı olarak silinir.
                        </p>
                    </Card>

                    <Card icon={UserCheck} color="text-fuchsia-400" title="7. Kullanıcı Hakların">
                        <p className="mb-3">Aşağıdaki konularda her zaman talepte bulunabilirsin:</p>
                        <List
                            items={[
                                "Hakkında hangi verilerin tutulduğunu öğrenme",
                                "Yanlış veya eksik verilerin düzeltilmesini isteme",
                                "Hesabının ve verilerinin silinmesini talep etme",
                                "Verilerinin hangi amaçlarla kullanıldığını öğrenme",
                            ]}
                        />
                        <p className="mt-3">Hesabını uygulama içinden Profil, Ayarlar adımıyla kendin de silebilirsin.</p>
                    </Card>

                    <Card icon={Lock} color="text-rose-400" title="8. Güvenlik">
                        <p>
                            Verilerinin yetkisiz erişime karşı korunması için makul teknik ve idari tedbirler uygulanır. Ancak internet üzerinden yapılan hiçbir aktarımın
                            tamamen güvenli olduğu garanti edilemez.
                        </p>
                    </Card>

                    <Card icon={RefreshCw} color="text-teal-400" title="9. Politika Değişiklikleri">
                        <p>
                            Bu gizlilik politikası zaman zaman güncellenebilir. Sayfanın üstündeki tarihin değişmesi, yeni sürümün yürürlükte olduğu anlamına gelir.
                        </p>
                    </Card>

                    {/* İletişim, full width */}
                    <div className="md:col-span-2 rounded-2xl border border-border/50 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 p-6">
                        <div className="flex items-start gap-4">
                            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/50 text-cyan-400">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold tracking-tight">10. İletişim</h2>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                    Gizlilikle ilgili soruların veya taleplerin için bize yaz:{" "}
                                    <a href="mailto:info@gghub.social" className="font-medium text-primary hover:underline">
                                        info@gghub.social
                                    </a>
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
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/80" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}
