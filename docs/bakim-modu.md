# Bakım modu kılavuzu

Kod: `ui/src/core/lib/maintenance.ts` ve `ui/src/middleware.ts`. Önizleme her zaman açık: https://gghub.social/maintenance

## 1. Şu anki durum (14 Ekim 2026 öğleden sonra, bakıma alındı)

| Parça | Durum | Nerede |
|---|---|---|
| Web | Bakım sayfası, 503 | Railway > GGHub / UI > Variables: `MAINTENANCE_MODE=1` |
| Mobil | Bakım ekranı (dinozor oyunlu) | `api.gghub.social` UI servisine bağlı, UI "maintenance" cevabı veriyor |
| Backend | DURDU (deployment Removed) | Railway > GGHub / api. Servis, 31 değişken, ayarlar yerinde |
| Postgres | AÇIK, veri yerinde | Railway > Postgres (dokunulmadı) |
| Katalog botu (Mac) | Durdu + açılışta başlamıyor | `launchctl disable gui/$(id -u)/social.gghub.bot` yapıldı |
| www.gghub.social | Cloudflare 301 -> gghub.social | Cloudflare > Rules > "Redirect from WWW to root", `www` kaydı Proxied |

Bakımdayken beklenen fatura: ayda ~7 $ (Postgres ~5 $, web ~2 $).

### Bakım sürerken DOKUNMA

- **GGHub / api değişkenlerini değiştirme.** Railway değişken değişince servisi kendiliğinden yeniden başlatır,
  backend sessizce açılır ve para yakar. (14 Ekim'de tam olarak bu oldu.)
- **`backend/` altına dokunan push yapma.** Aynı sebep: Railway otomatik deploy eder.
- `ui/` push'u sorun değil, web bakım bayrağıyla tekrar bakım sayfası olarak açılır.
- Railway Hobby: servis başına en fazla 2 özel alan adı. UI'da şu an `gghub.social` + `api.gghub.social` var.

### Eski ve yeni DNS değerleri (Cloudflare > DNS > Records)

| Kayıt | Bakımdan ÖNCE | Bakımda (şimdi) |
|---|---|---|
| `api` CNAME | `zsyz1tgi.up.railway.app` (API servisi) | `66sdk2sn.up.railway.app` (UI servisi) |
| `_railway-verify.api` TXT | yoktu | `railway-verify=5578d9a4...2c4c` (UI servisi için) |
| `www` CNAME | `o60ys4ka.up.railway.app`, DNS only | aynı hedef, Proxied + yönlendirme kuralı |

Railway alan adını yeniden eklerken YENİ hedef ve YENİ TXT değeri verebilir. Her zaman Railway'in o an
gösterdiği değeri yaz, bu tablodakini değil.

## 1b. 15 Ekim 2026: Railway 20 $ limitine vurdu, HER ŞEY kapandı

Railway "Deployments stopped": UI (bakım sayfası) ve Postgres de offline alındı. Railway belgesine göre bu
"offline", silme değil; veri volume'da durur ve **yeni fatura döneminde (5 Kasım) Railway durdurulan servisleri
kendiliğinden yeniden başlatır**. API'yi biz Removed yaptığımız için o kendiliğinden gelmez (iyi).

Karar: Ekim boyunca Railway'e hiç dokunulmaz, limit yükseltilmez. Bakım sayfası ve mobil bakım cevabı
**Cloudflare Worker**'dan (ücretsiz) verilir:
- Worker kodu: `docs/bakim-worker.js` (maintenance.ts'ten üretildi). Worker adı: `gghub-bakim`.
- Rotalar: `gghub.social/*`, `api.gghub.social/*` (www rotası yok, www'yu yönlendirme kuralı karşılıyor).
- DNS: `gghub.social` ve `api` kayıtları **Proxied (turuncu)** yapıldı; worker isteği Railway'e gitmeden cevaplar.
- Yeniden üretmek için (metin değişirse): `ui/` içinde maintenance.ts'i düzenle, sonra bu oturuma "worker'ı yeniden üret" de.

## 2. Geri açma (5 Kasım 2026 veya sonrası, ~30 dk)

Neden 5 Kasım: Railway fatura dönemi her ayın 5'inde sıfırlanır. Önce açılırsa Ekim'in limitine yazar.
Bu oturuma gel ve "bakımdan çıkalım" de. **Railway ve Cloudflare tıklamalarını Claude, Ahmet'in açık Chrome'unda kendisi yapar** (Ahmet'in açık isteği, 15 Ekim). Ahmet yalnız giriş ekranı çıkarsa devreye girer. Adımlar sırayla:

### Adım 1: Backend'i aç (~7 dk)
1. Railway > kanvasta **GGHub / api** kartına tıkla > **Variables** > `MAINTENANCE_MODE` satırı > ⋮ > Delete.
   (Bu değişken yanlışlıkla buraya da eklenmişti, backend okumaz ama temiz kalsın.)
2. **Deployments** sekmesi > "Deploy the repo AhmetDemiroglu/GGHub" düğmesi.
   Bu düğme yoksa History'deki en üstteki REMOVED satırı > ⋮ > **Redeploy**.
3. Yeşil **ACTIVE** + "Deployment successful" yazana kadar bekle (~5 dk, migration'lar da uygulanır).
4. Kontrol (tarayıcıda aç), `"status":"ok"` görmelisin:
   https://gghub-production.up.railway.app/api/app-release/check?platform=ios&version=1.4.0

### Adım 2: api alan adını UI'dan sök (~1 dk)
1. Railway > **GGHub / UI** > **Settings** > Networking.
2. `api.gghub.social` satırındaki çöp kutusu > açılan pencerede kırmızı **Delete**.
   Bu andan Adım 4 bitene kadar mobil uygulama hata görür. Ara vermeden devam et.

### Adım 3: api alan adını API servisine tak (~2 dk)
1. Railway > **GGHub / api** > **Settings** > Networking > **Custom Domain** > `api.gghub.social` yaz.
2. Port sorarsa `8080`.
3. Satırdaki **"DNS records"** yazısına tıkla. İki değeri not al:
   - CNAME `api` -> `xxxx.up.railway.app`
   - TXT `_railway-verify.api` -> `railway-verify=...` (istemeyebilir)

### Adım 4: Cloudflare DNS (~3 dk + sertifika 5-15 dk)
1. Cloudflare > gghub.social > **DNS > Records**.
2. `api` satırı > **Edit** > Target = Adım 3'teki CNAME değeri. Bulut GRİ (DNS only) kalsın > **Save**.
3. Railway TXT istediyse: `_railway-verify.api` satırı > Edit > Content = Adım 3'teki TXT > Save.
   İstemediyse bu TXT kaydını **Delete** ile sil.
4. Railway'de alan adının yanında yeşil tik çıkmasını bekle ("Waiting for DNS update" yazıyorsa bekle).
5. Kontrol, `"status":"ok"` görmelisin (SSL hatası alırsan 5 dk sonra tekrar dene):
   https://api.gghub.social/api/app-release/check?platform=ios&version=1.4.0

### Adım 5: Web'i bakımdan çıkar (~6 dk)
1. Railway > **GGHub / UI** > **Variables** > `MAINTENANCE_MODE` > ⋮ > Delete.
2. Üstte çıkan **Deploy** düğmesine bas, ~3 dk bekle. (Railway UI'ı 5 Kasım'da kendiliğinden
   başlatmadıysa Deployments > en üst satır > ⋮ > Redeploy.)
3. **Cloudflare Worker'ı devreden çıkar:** Workers & Pages > `gghub-bakim` > Settings > Domains & Routes >
   iki rotayı da sil (`gghub.social/*`, `api.gghub.social/*`). Worker'ı silmene gerek yok.
4. **Cloudflare DNS:** `gghub.social` ve `api` kayıtlarının bulutunu GRİ (DNS only) yap. `www` turuncu kalır
   (yönlendirme kuralı onu kullanıyor).
5. Kontrol: https://gghub.social normal siteyi açmalı, giriş yapılabilmeli.

### Adım 6: Geri kalanlar (~3 dk)
1. Mac katalog botu, terminalde sırayla:
   ```bash
   launchctl enable gui/$(id -u)/social.gghub.bot
   ```
   ```bash
   /Volumes/KIOXIA/Dev/SaaS/GGHub/scripts/gghub-bot start
   ```
2. Meta Ads Manager'da kampanyayı yeniden aç (istiyorsan).
3. Mobil uygulamayı tamamen kapatıp aç: normal açılmalı. Mağaza tarafında yapılacak bir şey yok.
4. Railway > Usage: limit 20 $ ise yerinde kalsın. Ertesi gün günlük artışa bak (hedef < 0,6 $/gün).

### Dokunulmayacaklar
- `www` yönlendirmesi kalıcı kalır. Railway'e geri ekleme, UI'da yer yok (2 alan adı sınırı).
- Postgres zaten açık.

## 3. Nasıl çalışıyor

- `MAINTENANCE_MODE=1` (UI servisi): web'in her sayfası 503 + `Retry-After` ile statik bakım sayfası döner.
  Google bunu "geçici kapalı" diye okur, sıralamayı silmez. Sayfa backend'e istek atmaz.
- `api.gghub.social` UI servisine gelince: `/api/app-release/check` "maintenance" döner, diğer her istek JSON 503 alır.
  Bu, bayraktan bağımsızdır. Normal çalışmada api host'u UI servisine hiç gelmez.
- Mobil kapı (`AppReleaseGate`) açılışta ve uygulama öne gelince bu ucu sorar, bakım görünce `BlockedScreen` açar.
  Uç ağ/SSL hatası verirse kapı "ok" varsayar ve uygulama açılıp hata gösterir (14 Ekim'de TXT eksikken olan buydu).
- Bakım mesajı (TR/EN) `maintenance.ts` içindeki `MOBILE_MESSAGE` ve `COPY`. Tarih değişirse oradan güncelle.
