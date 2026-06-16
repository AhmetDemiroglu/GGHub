# GGHub — iOS App Store Yayın Playbook'u

> Bu belge GGHub mobil uygulamasını **TestFlight → App Store**'a almak için adım adım rehberdir.
> Format: PureScan Foods playbook'u baz alınmıştır.
> Roller: **👤 SEN** = senin yapacağın (tıklama/konsol) · **🧭 REHBER** = Claude'un yönlendirmesi/kodu · **🤝 BİRLİKTE** = ekranı paylaşarak.

**Durum:** Kod tarafı (backend + web + mobil OAuth, iOS yayın ayarları) **TAMAMLANDI ve canlıya alındı**. Kalan: OAuth konsol kimlikleri + Apple yayın adımları (bu belgedeki 👤 adımlar).

---

## 0. Sabit Bilgiler (GGHub)

| Alan | Değer |
|------|-------|
| App adı | GGHub |
| iOS Bundle ID | `com.gghub.mobile` |
| Backend (Railway) | `https://api.gghub.social` |
| Web (Vercel) | `https://gghub.social` |
| Apple Team ID | _(PureScan ile aynı hesap ise `L56HGU8K3U` — App Store Connect'ten teyit et)_ |
| Sürüm / Build | `1.0.0` / `1` |
| Cihaz hedefi | iPhone-only (v1) |
| Ödeme / Reklam | **YOK** (v1) — ileride eklenecek |

---

## 1. Gece tamamlananlar (referans — yeniden yapmana gerek yok)

- ✅ **Backend OAuth** (`/api/auth/google`, `/api/auth/apple`) yazıldı, Railway'e deploy edildi, DB migration uygulandı. Canlı doğrulandı (geçersiz token → 400).
- ✅ **Web** (login + register) Google/Apple butonları eklendi, Vercel'e deploy edildi. **Butonlar env girilene kadar gizli.**
- ✅ **Mobil** Google/Apple butonları eklendi; `expo-apple-authentication` + `@react-native-google-signin/google-signin` kuruldu; `app.json` iOS yayın ayarları yapıldı; `ios/` prebuild üretildi.
- ✅ **Gemini çeviri modeli** `gemini-3.1-flash-lite` (stable) olarak güncellendi, deploy edildi.
- ✅ App ikonu 1024² kare (`icon-beyaz.png`), iPhone-only, encryption flag, edge swipe-back.

> ⚠️ OAuth **kimlik bilgileri (client ID'ler) henüz yok** → giriş butonları gizli ve uçtan uca test edilemedi. Aşağıdaki 2–3. adımlar bunları üretip yerleştirir, sonra her şey aktifleşir.

---

## 2. OAuth Kimlik Bilgileri (👤 SEN — konsol işi)

### 2A. Google Cloud Console — OAuth Client ID'leri
1. https://console.cloud.google.com → proje seç/oluştur (örn. "GGHub").
2. **APIs & Services → OAuth consent screen**: External, uygulama adı "GGHub", destek e-postası, logo, `gghub.social` domain, yetkili domainler. Yayınla (Testing → Production veya test kullanıcıları ekle).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**, şu 3'ünü oluştur:
   - **Web application** → Authorized JavaScript origins: `https://gghub.social`, `https://www.gghub.social` (+ test için `http://localhost:3000`). → **Web Client ID** alınır.
   - **iOS** → Bundle ID: `com.gghub.mobile`. → **iOS Client ID** + **reversed client ID** (`com.googleusercontent.apps.XX…`) alınır.
   - **Android** → Package: `com.gghub.mobile` + release **SHA-1** (Android sürümünde lazım; iOS-only v1 için şimdilik atlanabilir).

### 2B. Apple Developer — Sign in with Apple
1. https://developer.apple.com → **Certificates, IDs & Profiles**.
2. **Identifiers → App ID `com.gghub.mobile`** → **Sign In with Apple** capability'sini etkinleştir (yoksa App ID'yi oluştur).
3. **Identifiers → + → Services IDs** → yeni Services ID (örn. `social.gghub.web` ya da `com.gghub.web`). Bu **web** Apple girişinin "client_id"si olacak.
   - Services ID → Configure → Domains: `gghub.social`, `www.gghub.social`; Return URLs: `https://gghub.social` (popup akışı için origin yeterli).
   - **Domain doğrulama dosyasını indir** → web projesine koy (aşağıda 3C).
4. _(Opsiyonel, ileride server-to-server için)_ **Keys → +** → Sign in with Apple key (`.p8`) oluştur, Key ID'yi not et. _v1 identity-token doğrulaması için gerekmez._

---

## 3. Kimlikleri Yerleştirme — "Değer → Yer" Tablosu (🤝 BİRLİKTE)

| Ürettiğin değer | Nereye |
|---|---|
| Google **Web** Client ID | Railway `GoogleAuth__ClientIds__0` · Vercel `NEXT_PUBLIC_GOOGLE_CLIENT_ID` · Mobil `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Google **iOS** Client ID | Railway `GoogleAuth__ClientIds__1` · Mobil `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| Google **Android** Client ID | Railway `GoogleAuth__ClientIds__2` _(Android sürümünde)_ |
| Google **reversed iOS** client ID (`com.googleusercontent.apps.…`) | `mobile-ui/app.json` → google-signin plugin `iosUrlScheme` (PLACEHOLDER'ı değiştir) |
| Apple **bundle id** `com.gghub.mobile` | Railway `AppleAuth__ClientIds__0` |
| Apple **Services ID** (web) | Railway `AppleAuth__ClientIds__1` · Vercel `NEXT_PUBLIC_APPLE_SERVICES_ID` |

### 3A. Railway (backend) — env
Railway → GGHub backend servisi → **Variables**:
```
GoogleAuth__ClientIds__0 = <web client id>
GoogleAuth__ClientIds__1 = <ios client id>
AppleAuth__ClientIds__0  = com.gghub.mobile
AppleAuth__ClientIds__1  = <apple services id>
```
Kaydet → otomatik redeploy. Doğrula (REHBER): `curl -X POST https://api.gghub.social/api/auth/google -d '{"idToken":"x"}'` → hâlâ 400 (config doğru, gerçek token bekliyor).

### 3B. Vercel (web) — env
Vercel → GGHub projesi → Settings → **Environment Variables** (Production):
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID   = <web client id>
NEXT_PUBLIC_APPLE_SERVICES_ID  = <apple services id>
```
> ⚠️ `NEXT_PUBLIC_*` **build-time** inline'lanır → kaydedince **Redeploy** gerekir (Deployments → Redeploy). Sonra login/register'da Google/Apple butonları görünür.

### 3C. Apple domain doğrulama dosyası (web)
2B'de indirdiğin dosyayı şuraya koy: `ui/public/.well-known/apple-developer-domain-association.txt` → commit + Vercel deploy → `https://gghub.social/.well-known/apple-developer-domain-association.txt` erişilebilir olmalı. Apple Services ID Configure ekranında "Verify" et.

### 3D. Mobil — `mobile-ui/.env` + app.json
`mobile-ui/.env` (yoksa oluştur):
```
EXPO_PUBLIC_API_URL=https://api.gghub.social
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id>
```
`mobile-ui/app.json` → `@react-native-google-signin/google-signin` plugin'inde `iosUrlScheme` değerini **reversed iOS client ID** ile değiştir. Sonra **prebuild'i tekrar çalıştır** (3E sonrası).

---

## 4. iOS Native Hazırlık (🧭 REHBER + 🤝)

`ios/` klasörü gece prebuild ile üretildi. Kimlikleri (3D) girdikten sonra **yeniden prebuild** gerekir ki iosUrlScheme Info.plist'e işlensin:
```bash
cd mobile-ui
export LANG=en_US.UTF-8
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
```
> Not: `ios/` ve `android/` gitignore'da (Expo managed-prebuild). Native değişiklik gerektiğinde prebuild tekrar çalışır.

---

## 5. Kendi iPhone'una Xcode ile Deploy (🤝 BİRLİKTE — test)
1. `open mobile-ui/ios/GGHub.xcworkspace` (Xcode).
2. Xcode → **Signing & Capabilities** → Team'i seç (Apple Developer hesabın). "Automatically manage signing" açık. Bundle ID `com.gghub.mobile`.
3. **Sign in with Apple** capability'sinin ekli olduğunu doğrula (app.json `usesAppleSignIn:true` ile gelir).
4. iPhone'u USB ile bağla, Xcode'da hedef cihaz olarak seç (ilk seferde cihazı "Trust" + Developer Mode aç).
5. **Run (▶)** → uygulama telefona kurulur.
6. **Test checklist:**
   - [ ] Açılış, login/register ekranları
   - [ ] E-posta/şifre ile giriş
   - [ ] **Google ile giriş** (uçtan uca)
   - [ ] **Apple ile giriş** (uçtan uca; ilk girişte isim gelir)
   - [ ] Ana akış, keşfet, arama, listeler, mesajlaşma (SignalR), profil
   - [ ] Profil foto yükleme (kamera/galeri izinleri)
   - [ ] **Edge swipe-back** (sağdan/soldan kaydırarak geri)
   - [ ] Oyun açıklaması Türkçe çeviri (Gemini)
   - [ ] **Hesap silme** (Ayarlar → Tehlikeli Alan)
   - [ ] TR/EN dil değişimi, dark/light tema

---

## 6. App Store Connect — Kayıt & Metadata (👤 SEN)
1. https://appstoreconnect.apple.com → **My Apps → +** → New App: Platform iOS, isim "GGHub", primary language, Bundle ID `com.gghub.mobile`, SKU (örn. `gghub-001`).
2. **App Information**: kategori (öneri: **Social Networking**), içerik hakları, **age rating** anketi (UGC + mesajlaşma olduğundan büyük ihtimal **12+/17+**).
3. **App Privacy (Nutrition Labels)** — GGHub'ın topladıkları:
   - İletişim bilgisi (e-posta), kullanıcı içeriği (yorum/liste/mesaj/foto), tanımlayıcılar (user id), kullanım verisi.
   - **Tracking: YOK** (reklam/ATT yok). "Used to Track You" = Hayır.
4. **Pricing & Availability**: Free. Ülkeler (Çin/Rusya/İran/K.Kore hariç bırakılabilir).
5. **Privacy Policy URL**: `https://gghub.social/privacy` · **Support URL**: `https://gghub.social` (veya destek/iletişim sayfası).

### 6A. Ekran görüntüleri (👤/🤝)
- 6.7" iPhone (1290×2796) zorunlu; Apple küçükler için ölçekler. Simülatörden veya cihazdan al.
- Öneri ekranlar: Ana akış, Keşfet, Oyun detayı, Listeler, Profil, (giriş ekranı sosyal butonlarla).
- REHBER simülatörden otomatik alabilir: `xcrun simctl io booted screenshot ekran.png`.

---

## 7. Apple Review için Demo Hesap (👤/🧭)
Apple gözden geçiricisi giriş yapamazsa reddeder. App Store Connect → app sürümü → **App Review Information**:
- Demo hesabı sağla: e-posta + şifre. (REHBER: prod'da bir test kullanıcısı kayıt edip e-posta doğrulamasını tamamlayabilir; ya da DB'de `IsEmailVerified=true` yapılır.)
- Notes: "Social platform for gamers. Login required. Email/Google/Apple sign-in supported. Demo account provided."

---

## 8. Archive + TestFlight (🤝 BİRLİKTE)
1. Xcode → üst hedef: **Any iOS Device (arm64)**.
2. **Product → Archive** (Release).
3. Organizer → **Distribute App → App Store Connect → Upload**.
4. **Export Compliance**: şifreleme yok → `ITSAppUsesNonExemptEncryption=false` zaten ayarlı, soru çıkmaz.
5. İşleme 10–60 dk. → App Store Connect → **TestFlight**'ta görünür.
6. TestFlight'tan kendine/test kullanıcılarına dağıt, release build'de tüm checklist'i (Bölüm 5) tekrar test et.

---

## 9. Submit + Reddedilme Senaryoları (👤/🧭)
App Store Connect → sürüm → build seç → **Add for Review → Submit**.
- **IDFA**: Hayır (reklam yok).
- Hazır cevaplar:
  - **4.8 (Sign in with Apple)**: "Apple ile Giriş, Google ile birlikte sunuluyor; gizlilik dostu seçenek mevcut." ✅ (zaten karşılanıyor)
  - **5.1.1 (hesap silme)**: "Uygulama içi hesap silme: Ayarlar → Tehlikeli Alan → Hesabı Sil (`DELETE /api/profile/me`)." ✅
  - **1.2 (UGC)**: "Raporlama + kullanıcı engelleme + moderasyon mevcut." ✅
  - **2.1 (eksik bilgi)**: Demo hesabı + review notları sağlandı.
  - **3.1.1**: Dijital ödeme/IAP yok (v1).

---

## 10. Yayın Sonrası & Gelecek Güncellemeler
- Onaydan sonra "Release this version" (veya otomatik). 1–24 saatte mağazada görünür.
- Landing/web'e App Store linkini ekle.
- **Sonraki sürüm**: `app.json` `version`/`ios.buildNumber` arttır → prebuild → Archive → yeni sürüm → "What's New" → Submit.
- **Sıradaki büyük işler** (ayrı plan): Android yayını (SHA-1 + Google Android client ID), abonelik/IAP (RevenueCat), reklam (AdMob + ATT), push notification (APNs).

---

## EK: Gece bulunan, sonra bakılacak ufak konular
- **Mobil route uyumsuzlukları** (typedRoutes, Metro çalışır ama tip hatası): `app/lists/[listId].tsx`, `app/reviews/user/[username].tsx`, `src/components/home/ActivityFeed.tsx` (`/games/${id}` → muhtemelen `/game/${id}`), `src/components/home/BentoGrid.tsx` (`/auth/register` → `/(auth)/register`). Navigasyon bug'ı olabilir — kontrol et.
- **Web build lint**: `next build` mevcut (dokunulmamış) dosyalardaki ESLint hatalarında lokal olarak kırılıyor; Vercel tolere ediyor. İstenirse `eslint.ignoreDuringBuilds` veya hataların düzeltilmesi.
- **Migration yedeği**: `~/gghub-backups/gghub-oauth-migration-idempotent.sql` (rollback referansı).
- **Secrets**: `appsettings.Development.json` repo'da gerçek bağlantı/anahtar içeriyor — ileride gizli yönetimi düşünülebilir.
