import { Button } from "../../core/components/ui/button";
import {
    Construction,
    HardHat,
    Wrench,
    Gamepad2,
    Users,
    MessageSquare,
    ShieldBan,
    ListChecks,
    MessageCircle,
    ThumbsUp,
    Library,
    Bell,
    Star,
    Image as ImageIcon,
    Rocket,
    Smartphone,
} from "lucide-react";

export default function HomePage() {
    return (
        <div className="w-full h-full overflow-y-auto p-5">
            <div className="space-y-4">
                <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 md:p-10">
                    <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

                    <div className="flex items-center gap-2 text-amber-400">
                        <Construction className="h-5 w-5" />
                        <span className="text-sm font-medium">Erken Erişim • Aktif Geliştirme</span>
                    </div>

                    <div className="mt-4 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">GGHub</h1>
                            <p className="mt-1 text-zinc-300">Türkiye&apos;nin oyuncu sosyal platformu.</p>
                            <p className="mt-4 max-w-2xl text-zinc-400 text-sm">
                                Şu an temel özelliklerle yayındayız; gerçek ana sayfa ve büyük arayüz güncellemeleri yolda. Geliştirme sürecini şeffaf biçimde paylaşıyoruz.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <a href="/discover">
                                <Button className="min-w-40 flex items-center gap-2 cursor-pointer">
                                    <Gamepad2 className="h-4 w-4" /> Oyunları Keşfet
                                </Button>
                            </a>
                            <a href="/lists">
                                <Button variant="outline" className="min-w-40 border-zinc-700 text-zinc-100 flex items-center gap-2 cursor-pointer">
                                    <Library className="h-4 w-4" /> Listeleri Keşfet
                                </Button>
                            </a>
                        </div>
                    </div>

                    <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <HardHat className="h-5 w-5 text-amber-400" />
                            <span className="text-sm">Geliştirme Durumu</span>
                        </div>
                        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                            <div className="relative h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500">
                                <div
                                    className="absolute inset-0 animate-[stripe_2s_linear_infinite] bg-[length:24px_24px] opacity-30"
                                    style={{
                                        backgroundImage:
                                            "linear-gradient(135deg, rgba(255,255,255,.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.25) 50%, rgba(255,255,255,.25) 75%, transparent 75%, transparent)",
                                    }}
                                />
                                <div className="absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white/70 blur-md" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    {/* Şu Anda Yapabileceklerin */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Gamepad2 className="h-5 w-5 text-cyan-400" />
                            <h2 className="text-lg font-semibold">Şu Anda Yapabileceklerin</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-zinc-300">
                            <li className="flex items-start gap-3">
                                <Users className="mt-0.5 h-4 w-4 text-emerald-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Kayıt • Profil • Takip</p>
                                    <p className="text-zinc-400">Kullanıcı oluştur, profilleri takip et, akışını şekillendir.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <ShieldBan className="mt-0.5 h-4 w-4 text-rose-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Engelle / Engeli Kaldır</p>
                                    <p className="text-zinc-400">İstemediğin kullanıcılarla etkileşimi anında kes.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <MessageSquare className="mt-0.5 h-4 w-4 text-indigo-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Özel Mesajlaşma</p>
                                    <p className="text-zinc-400">Gerçek zamanlı sohbetle iletişim kur.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <ListChecks className="mt-0.5 h-4 w-4 text-amber-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Oyun Listeleri</p>
                                    <p className="text-zinc-400">Listeler oluştur, düzenle, başkalarının listelerini keşfet.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <MessageCircle className="mt-0.5 h-4 w-4 text-teal-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Liste Yorumları</p>
                                    <p className="text-zinc-400">Listelere yorum yap, tartışmalara katıl.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <ThumbsUp className="mt-0.5 h-4 w-4 text-fuchsia-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Yorum Değerlendirme</p>
                                    <p className="text-zinc-400">Yorumları oylayarak kaliteli içeriği öne çıkar.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Library className="mt-0.5 h-4 w-4 text-yellow-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Listeleri Puanla & Takip Et</p>
                                    <p className="text-zinc-400">Listeleri oylayabilir, favorilerini takip edebilirsin.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Bell className="mt-0.5 h-4 w-4 text-indigo-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Bildirimler</p>
                                    <p className="text-zinc-400">Takip, yorum, beğeni ve mesaj aktivitelerinde gerçek zamanlı bildirim.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Rocket className="mt-0.5 h-4 w-4 text-cyan-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Oyun & Kullanıcı Arama</p>
                                    <p className="text-zinc-400">Gelişmiş arama ile oyunları ve kullanıcıları hızlıca bul.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Yakında Gelecekler */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-amber-400" />
                            <h2 className="text-lg font-semibold">Yakında Gelecekler</h2>
                        </div>
                        <ul className="space-y-3 text-sm text-zinc-300">
                            <li className="flex items-start gap-3">
                                <Rocket className="mt-0.5 h-4 w-4 text-cyan-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Kişiselleştirilmiş Ana Sayfa</p>
                                    <p className="text-zinc-400">Kişiye özel akış, öne çıkan etkinlikler ve keşif modülü.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Gamepad2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Oyun Detay • Puanlama • Yorumlama</p>
                                    <p className="text-zinc-400">Oyun sayfalarında ayrıntılı bilgi, puan ve yorum sistemi.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Users className="mt-0.5 h-4 w-4 text-indigo-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Topluluk İçerik Editleri</p>
                                    <p className="text-zinc-400">Kullanıcılar oyun içeriklerini düzenleyebilecek; admin onayı ile içerik üreticisi olacak.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Star className="mt-0.5 h-4 w-4 text-yellow-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Rozetler & Profil Seviyeleri</p>
                                    <p className="text-zinc-400">Katkı ve aktiviteye göre gelişen profil sistemi.</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <ImageIcon className="mt-0.5 h-4 w-4 text-pink-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Görsel Yükleme</p>
                                    <p className="text-zinc-400">Yorum, header ve oyun içeriklerine görsel ekleyebilme (şimdilik sadece profil foto mevcut).</p>
                                </div>
                            </li>

                            <li className="flex items-start gap-3">
                                <Smartphone className="mt-0.5 h-4 w-4 text-teal-400" />
                                <div>
                                    <p className="font-medium text-zinc-100">Mobil Uyumluluk</p>
                                    <p className="text-zinc-400">Tüm sayfalar responsive hâle getirilecek, performans iyileştirilecek.</p>
                                </div>
                            </li>
                        </ul>
                        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400 ">Geri bildirimlerin doğrultusunda sıralama ve kapsam güncellenebilir.</div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <h3 className="mb-2 text-lg font-semibold">Geri Bildirim</h3>
                    <p className="text-sm text-zinc-300">info@gghub.social adresi üzerinden bizimle iletişime geçebilirsiniz.</p>
                    <div className="mt-3">
                        <a href="mailto:info@gghub.social?subject=GGHub%20Geri%20Bildirim">
                            <Button className="min-w-40 cursor-pointer">Geri Bildirim Gönder</Button>
                        </a>
                    </div>
                </section>

                <style>{`
          @keyframes stripe {
            0% { background-position: 0 0; }
            100% { background-position: 24px 0; }
          }
        `}</style>
            </div>
        </div>
    );
}
