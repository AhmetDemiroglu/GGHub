# Bakım modu kılavuzu

Anlık durum: `scripts/gghub-durum` (yalnız okur; MOD: BAKIM / ACIK / KARISIK yazar).
Bakım sayfası kaynağı: `ui/src/core/lib/maintenance.ts`. Cloudflare Worker kopyası: `docs/bakim-worker.js`.

## 0. Faturanın kök nedeni (15 Ekim 2026 kanıtlı teşhis)

5-15 Ekim faturası 20,03 $: RAM 10,7 $ (UI 5,5 + api 3,8 + Postgres 1,4), Postgres egress 5,6 $ (111 GB), CPU 0,13 $.
Trafik kaynağı insan değil: web analitiği 7 günde 99 insan sayfa görüntülemesi gösterirken API haftada 130 bin istek aldı.

### Neden 1: Benzer oyunlar ucu + Applebot + public DB bağlantısı (egress 5,6 $)
- **Kim:** Apple'ın tarayıcısı Applebot (17.166.x.x), JavaScript çalıştırdığı için her oyun sayfasında istemci tarafı
  `GET /api/games/{id}/suggested` çağrısını tetikledi. Railway HTTP loglarında 4 ayrı örnek (11, 13, 14 Ekim) hepsi Applebot;
  14 Ekim 10:47-10:48'de 40 saniyede 6 çağrı (saatte ~500).
- **Ne:** `SimilarGamesService.LoadProfilesAsync` etiketleri projeksiyonda `g.Tags.Select(...)` ile alıyordu. EF Core tek sorguda
  `LEFT JOIN "GameTags"` üretip oyunun tüm JSON kolonlarını her etiket satırında tekrarlıyordu (`ToQueryString` ile doğrulandı).
  ~700 aday x ~25 etiket = ~17 bin satır, çağrı başına onlarca MB. 13 Ekim 20:00'den sonra Postgres egress saatte 3-5 GB.
- **Neden ücretli:** API, Postgres'e Railway'in public proxy'si (`*.proxy.rlwy.net`) üzerinden bağlıydı; iç ağ (`railway.internal`)
  ücretsizdir. Mac'teki katalog botu ölçüldü: aynı saatlerde 0,3 MB, suçlu değil.
- **Düzeltme:** `AsSplitQuery()` (dal `bakim-5kasim`, commit d4728e3; 5 Kasım'da main'e alınır). Bağlantı iç ağa
  (Adım 1.1). Cloudflare `/suggested` cevabını 6 saat önbellekler (Adım 5b).

### Neden 2: Web sunucusu Node belleği sınırsız (RAM 5,5 $)
- Railway kabı 8 GB gösterdiği için V8 çöp toplamayı erteliyor; tarama yükü altında heap büyüyor.
  Yerel ölçüm (sahte API, 2400 oyun sayfası, 20 sn): sınırsız 251 -> 1150 MB ve yükselmeye devam; `--max-old-space-size=512`
  ile 249 -> 412 MB sabit. Canlıda görülen 1,5-2,1 GB bununla uyumlu.
- Görsel optimizasyonu (sharp/AVIF) ölçüldü: 516 görsel +74 MB, ana neden değil.
- **Düzeltme:** commit 6893401 (`MALLOC_ARENA_MAX=2 NODE_OPTIONS=--max-old-space-size=512 next start`), main'de.

### Neden 3: API .NET Server GC (RAM 3,8 $)
- 8 vCPU'lu kapta Server GC çekirdek başına heap açıp ~1,2 GB'ta duruyordu. `ServerGarbageCollection=false` (6893401).
  Beklenen: ~300 MB. 5 Kasım'da Metrics'ten doğrulanır.

### Hedef
Aylık ~12 $ (Postgres 4,6 + UI ~4 + api ~3 + egress ~0). 10 $ e-posta uyarısı, 20 $ hard limit.

## 1. Şu anki durum (15 Ekim 2026 akşamı)

| Parça | Durum |
|---|---|
| Web + mobil bakım cevabı | Cloudflare Worker `gghub-bakim` veriyor (ücretsiz). Rotalar: `gghub.social/*`, `api.gghub.social/*` |
| DNS | `gghub.social`, `api`, `www` hepsi Proxied (turuncu). SSL/TLS modu **Full** (Railway'in istediği mod) |
| www | Cloudflare kuralı "Redirect from WWW to root" (301), kalıcı |
| Railway | 15 Ekim'de 20 $ limitine vurdu, tüm deployment'lar durdu. Veri volume'da duruyor |
| Railway / UI servisi | Durduruldu. Değişkeni `MAINTENANCE_MODE=1`. Alan adları: `gghub.social` + `api.gghub.social` |
| Railway / api servisi | Deployment Removed (14 Ekim, elle). Railway kendiliğinden açmaz. Değişkenlerinde fazladan `MAINTENANCE_MODE` var |
| Railway / Postgres | Durduruldu, veri yerinde. 5 Kasım'da Railway kendiliğinden başlatır |
| Mac katalog botu | Durdu + açılışta başlamıyor (`launchctl disable gui/$(id -u)/social.gghub.bot`) |

Bakımdayken maliyet: Railway 0 $, Cloudflare 0 $.

### Bakım sürerken DOKUNMA
- **Railway'de limit yükseltme ve deploy yok.** Ekim limitine yazar.
- **GGHub / api değişkenlerine dokunma, `backend/` push'u yapma:** Railway servisi kendiliğinden yeniden başlatır (14 Ekim'de oldu).

### DNS değerleri (Cloudflare > DNS > Records)

| Kayıt | Bakımdan ÖNCE | Şimdi |
|---|---|---|
| `gghub.social` CNAME | `o5qfo2qo.up.railway.app`, gri | aynı hedef, turuncu |
| `api` CNAME | `zsyz1tgi.up.railway.app` (api servisi), gri | `66sdk2sn.up.railway.app` (UI servisi), turuncu |
| `_railway-verify.api` TXT | yoktu | `railway-verify=5578d9a4...2c4c` (UI servisi için) |
| `www` CNAME | `o60ys4ka.up.railway.app`, gri | aynı hedef, turuncu + yönlendirme kuralı |

Railway alan adını yeniden eklerken YENİ hedef ve YENİ TXT verebilir. Her zaman Railway'in o an gösterdiğini yaz.

## 2. Geri açma: 5 Kasım 2026 veya sonrası (Claude yürütür, ~40 dk)

Ahmet bu oturuma gelip "bakımdan çıkalım" der. **Tüm Railway ve Cloudflare tıklamalarını Claude, Ahmet'in açık
Chrome'unda kendisi yapar** (Ahmet'in açık isteği, 15 Ekim). Ahmet yalnız giriş ekranı çıkarsa devreye girer.

**Kesintisiz açılış fikri:** worker rotaları EN SONA kadar açık kalır. Kullanıcılar bakım ekranını görürken
backend açılır, alan adı taşınır ve hepsi arkadan test edilir. Son adımda rotalar silinince trafik bir anda
Railway'e geçer. Mobil hiç "bir hata oluştu" görmez. Bir şey bozulursa rotaları geri eklemek 1 dk sürer.
DNS kayıtları turuncu KALIR (Railway belgesi: proxy + SSL Full desteklenir); bu da sonraki bakımı tek adıma indirir (bölüm 3).

### Adım 0: Ön kontrol (~5 dk)
1. Tarih 5 Kasım veya sonrası mı? Değilse dur.
2. `scripts/gghub-durum` > MOD: BAKIM olmalı.
3. Railway > Usage: "Current Usage" yeni döneme sıfırlanmış mı (birkaç sent). Compute limiti 20 $ yerinde mi.
4. Railway kanvas: Postgres ve UI "Online" mı? Değilse ilgili servis > Deployments > en üst satır > ⋮ > Redeploy.
5. Railway > Usage > limit ayarlarında e-posta uyarısını **10 $**'a kur (yoksa ekle). Hard limit 20 $ kalır.

### Adım 1: Maliyet kilidi, backend açılmadan ÖNCE (~5 dk)
0. Terminal: `git checkout main && git merge bakim-5kasim && git push origin main` (AsSplitQuery düzeltmesi main'e girer;
   api servisi Removed olduğu için push tek başına backend'i açmaz, UI yeniden deploy olur, bakım sayfası worker'da).
1. GGHub / api > Variables > `ConnectionStrings__DefaultConnection`: yalnız Host kısmına bak.
   `railway.internal` içermeli. `proxy.rlwy.net` görürsen değeri şununla değiştir (şifreyi göstermez):
   ```
   Host=${{Postgres.RAILWAY_PRIVATE_DOMAIN}};Port=5432;Database=${{Postgres.PGDATABASE}};Username=${{Postgres.PGUSER}};Password=${{Postgres.PGPASSWORD}}
   ```
   Sebep: 14 Ekim faturasının 1/3'ü bu public bağlantının egress'iydi (111 GB).
2. Aynı sayfada fazladan `MAINTENANCE_MODE` satırını sil.
3. Repo'da RAM ayarı duruyor mu: `GGHub.WebAPI.csproj` içinde `ServerGarbageCollection=false`,
   `ui/package.json` start'ta `--max-old-space-size=512`. (6893401 commit'i.)

### Adım 2: Backend'i aç, arkadan test et (~8 dk)
1. GGHub / api > Deployments > "Deploy the repo" düğmesi ya da History'deki en üst REMOVED > ⋮ > Redeploy.
2. ACTIVE + "Deployment successful" bekle (~5 dk, migration'lar uygulanır).
3. Test: `https://gghub-production.up.railway.app/api/app-release/check?platform=ios&version=1.4.0` > `"status":"ok"`.
   (`scripts/gghub-durum` "backend (Railway) calisiyor (ok)" yazar.)

### Adım 3: api alan adını backend'e taşı, kullanıcı görmez (~10 dk)
1. GGHub / UI > Settings > Networking > `api.gghub.social` > çöp kutusu > Delete.
2. GGHub / api > Settings > Networking > Custom Domain > `api.gghub.social`, port `8080`.
3. Satırdaki "DNS records": CNAME hedefi ve TXT değerini oku.
4. Cloudflare DNS: `api` CNAME > Edit > Target = yeni hedef, bulut TURUNCU kalsın > Save.
   `_railway-verify.api` TXT > Edit > Content = yeni TXT > Save (TXT istemediyse sil).
5. Railway'de alan adı yeşil tik alana kadar bekle. Worker hâlâ önde olduğu için mobil bakım ekranında kalır.
6. Arkadan test (worker'ı atlar, Railway'e doğrudan gider):
   ```bash
   curl -sk --resolve api.gghub.social:443:$(dig +short <yeni-hedef>.up.railway.app | head -1) "https://api.gghub.social/api/app-release/check?platform=ios&version=1.4.0"
   ```
   `"status":"ok"` görmeli.

### Adım 4: Web'i bakımdan çıkar, arkadan test et (~6 dk)
1. GGHub / UI > Variables > `MAINTENANCE_MODE` > Delete > Deploy. ACTIVE bekle (~3 dk).
2. Arkadan test: `curl -sk --resolve gghub.social:443:$(dig +short o5qfo2qo.up.railway.app | head -1) https://gghub.social/tr`
   normal sitenin HTML'i gelmeli ("Bakımdayız" değil).

### Adım 5a: Cloudflare Cache Rules (~5 dk, perde kalkmadan)
Cloudflare > gghub.social > Caching > Cache Rules > Create rule. Üç kural, hepsi "Eligible for cache", Edge TTL "Override origin":
1. `benzer-oyunlar`: Hostname eq `api.gghub.social` AND URI Path matches regex `^/api/games/[^/]+/suggested$` -> 6 saat.
   (Uç kullanıcıya bağlı değil, Authorization taşısa da aynı cevap.)
2. `oyun-sayfalari`: Hostname eq `gghub.social` AND URI Path matches regex `^/(tr|en-US)/games/[^/]+$` -> 3 gün.
   (Middleware bu yollarda Set-Cookie yazmaz; Vercel'deki CDN önbelleğinin aynısı. Giriş yapmış kullanıcı istemcide tazeler.)
3. `next-static`: Hostname eq `gghub.social` AND URI Path starts with `/_next/static/` -> 30 gün.
Worker rotaları hâlâ önde olduğu için kurallar perde kalkınca devreye girer.

### Adım 5: Perdeyi kaldır (~2 dk)
1. Cloudflare > Workers & Pages > `gghub-bakim` > Domains > iki rotanın da ⋯ menüsünden sil.
   Worker'ı SİLME, sonraki bakımda lazım.
2. `scripts/gghub-durum` > MOD: ACIK. Tarayıcıda gghub.social aç, giriş yap. Mobil uygulamayı kapatıp aç.
3. Bozuk bir şey varsa: rotaları geri ekle (bölüm 3), sonra sakin sakin düzelt.

### Adım 6: Geri kalanlar ve izleme
1. Katalog botu:
   ```bash
   launchctl enable gui/$(id -u)/social.gghub.bot
   ```
   ```bash
   /Volumes/KIOXIA/Dev/SaaS/GGHub/scripts/gghub-bot start
   ```
2. 1 saat sonra Railway > servis Metrics > Memory: api ~300 MB, UI ~500 MB altında olmalı.
   Postgres > Metrics > Public Network Traffic: ~0 olmalı (değilse Adım 1.1 tutmamış).
3. Ertesi gün Usage: günlük artış < 0,5 $. Aylık hedef ~12-15 $.
4. Meta reklamları: Ahmet karar verir.

## 3. Bundan sonra bakıma alma (2 dk) ve çıkma

DNS turuncu kaldığı ve worker durduğu için bakım artık tek adım:
- **Bakıma al:** Cloudflare > `gghub-bakim` > Domains > Add Route: `gghub.social/*` ve `api.gghub.social/*`
  (zone gghub.social, Fail closed). Railway'deki servisler istenirse ayrıca durdurulur (Deployments > ⋮ > Remove).
- **Bakımdan çık:** iki rotayı sil.
- Alan adı taşıma, TXT, sertifika beklemek yok.

## 4. Nasıl çalışıyor

- Worker `gghub.social` için 503 + `Retry-After` ile bakım sayfası döner (Google "geçici kapalı" okur).
  `api.gghub.social/api/app-release/check` için `"status":"maintenance"` döner, diğer api istekleri JSON 503.
- Mobil kapı (`AppReleaseGate`) açılışta ve uygulama öne gelince bu ucu sorar, bakım görünce `BlockedScreen` açar.
  Uç hiç cevap vermezse (DNS/SSL hatası) kapı "ok" varsayar ve uygulama "bir hata oluştu" gösterir.
  Telefonlar eski DNS'i bir süre önbellekte tutar: uçak modu aç/kapa önbelleği temizler.
- Worker metni değişecekse: `maintenance.ts` düzenlenir, Claude `docs/bakim-worker.js`'i yeniden üretir.
  Dosya ASCII olmalı (Türkçe harfler `\uXXXX` kaçışlı): pano üzerinden yapıştırınca UTF-8 bozuluyordu.
  Cloudflare kod editörü Claude'un klavye girişini almıyor: yapıştırmayı Ahmet yapar ya da `npx wrangler@4 login`
  (Ahmet "Allow" der) + `npx wrangler@4 deploy -c docs/wrangler.bakim.toml`.
- Railway'in kendi bakım bayrağı da duruyor: UI servisinde `MAINTENANCE_MODE=1` (middleware). Worker varken gereksiz.
- Kaynaklar: [Railway: Working with Domains](https://docs.railway.com/networking/domains/working-with-domains),
  [Railway: Troubleshooting SSL](https://docs.railway.com/networking/troubleshooting/ssl).
