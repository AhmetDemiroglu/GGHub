# Bakım modu kılavuzu

Amaç: backend'i (Railway "GGHub / api") durdurup yalnız web servisini açık bırakmak. Site bakım sayfası
gösterir. Mağazadaki mobil uygulamalar yeni sürüm gerekmeden kendi bakım ekranını (dinozor oyunlu) açar.

Kod: `ui/src/core/lib/maintenance.ts` ve `ui/src/middleware.ts`. Önizleme her zaman açık:
https://gghub.social/maintenance

## A. İzleme (1-2 gün)

1. Railway > Usage sayfasında "Current Usage" değerini ve saati not al.
2. 24 saat sonra tekrar bak. Fark ~0,6 $ altındaysa site açık kalabilir.
3. Fark bunun üstündeyse B bölümüne geç.

Dikkat: 20 $ limit dolarsa Railway web servisini de durdurur, bakım sayfası da kapanır.
Limite ~1 $ kala B bölümünü uygula.

## B. Bakıma alma (~15 dk)

0. **Meta reklamlarını durdur:** Ads Manager'da kampanyayı kapat. Açık kalırsa bakımdaki uygulamaya para ödenir.

Başlamadan önce Cloudflare > DNS'te `api` kaydının CNAME hedefini bir yere kopyala. Geri dönüşte lazım.

1. **Web'i bakıma al:** Railway > GGHub / UI > Variables > New Variable: `MAINTENANCE_MODE` = `1` > Deploy.
   ~3 dk sonra https://gghub.social bakım sayfasını gösterir.
2. **api alan adını API'den sök:** Railway > GGHub / api > Settings > Networking > `api.gghub.social` > sil.
3. **api alan adını web'e tak:** Railway > GGHub / UI > Settings > Networking > Custom Domain >
   `api.gghub.social`. Railway yeni bir CNAME hedefi gösterir (TXT isterse onu da).
4. **Cloudflare DNS:** `api` CNAME hedefini 3. adımdaki değerle değiştir (gri bulut kalsın), TXT istendiyse ekle.
   Kontrol: aşağıdaki adres `"status":"maintenance"` dönmeli.
   https://api.gghub.social/api/app-release/check?platform=ios&version=1.4.0
5. **Backend'i durdur:** Railway > GGHub / api > Deployments > aktif deploy > ⋮ > Remove.

İsteğe bağlı: Mac'teki katalog botunu durdur: `scripts/gghub-bot stop`.
Postgres açık kalır, veri yerinde durur. Bakımdayken beklenen fatura ayda ~7 $.

## C. Bakımdan çıkma (~15 dk)

Zamanlama: Railway fatura dönemi her ayın 5'inde sıfırlanır. 5'inden önce açılırsa eski dönemin limitine yazar.
Bakım mesajı "Kasım ayının ilk haftası" diyor (`maintenance.ts`). Tarih değişirse oradaki metni güncelle.
Meta reklamlarını bakımdan çıkınca yeniden aç.

1. Railway > GGHub / api > Deployments > en son deploy > ⋮ > Redeploy. "Active" olmasını bekle.
2. Railway > GGHub / UI > Settings > Networking > `api.gghub.social` > sil.
3. Railway > GGHub / api > Settings > Networking > Custom Domain > `api.gghub.social` ekle.
4. Cloudflare DNS: `api` CNAME hedefini Railway'in verdiği yeni değere çevir.
   Kontrol: 4. adımdaki adres `"status":"ok"` dönmeli.
5. Railway > GGHub / UI > Variables > `MAINTENANCE_MODE` sil > Deploy. Katalog botu: `scripts/gghub-bot start`.

## Nasıl çalışıyor

- `MAINTENANCE_MODE=1`: web'in her sayfası 503 + `Retry-After` ile statik bakım sayfası döner.
  Google bunu "geçici kapalı" diye okur, sıralamayı silmez. Sayfa backend'e istek atmaz.
- `api.gghub.social` web servisine gelince: `/api/app-release/check` bakım cevabı döner, diğer her istek
  JSON 503 alır. Bu bayraktan bağımsızdır; normal çalışmada api host'u web servisine hiç gelmez.
- Mobil kapı (`AppReleaseGate`) açılışta ve uygulama öne gelince bu ucu sorar, bakım görünce
  navigator yerine `BlockedScreen` açar.
