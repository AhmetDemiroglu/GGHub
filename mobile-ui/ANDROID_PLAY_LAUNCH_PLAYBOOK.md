# GGHub — Android (Google Play) Yayın Playbook'u

> Bu belge GGHub mobil uygulamasını **imzalı AAB → Google Play (kapalı test → production)** sürecine almak için adım adım, milimetrik rehberdir.
> Format: `APP_STORE_LAUNCH_PLAYBOOK.md` (iOS) baz alınmıştır.
> Roller: **👤 SEN** = senin yapacağın (tıklama/konsol) · **🧭 REHBER** = Claude'un yönlendirmesi/kodu · **🤝 BİRLİKTE** = ekranı paylaşarak.

**Durum:** Kod tarafı (izin temizliği, native manifest, Google girişi Android, hesap silme web sayfası) **TAMAMLANDI**. Kalan: keystore + SHA, Google Cloud Android client, Play Console başvurusu (bu belgedeki 👤/🤝 adımlar).

> ⚠️ **EN KRİTİK ŞEY — ZAMAN:** Hesabın **kişisel** olduğu için, production'a başvurmadan önce **en az 12 testçiyle 14 gün KESİNTİSİZ kapalı test** yapman zorunlu (Google kuralı, Kasım 2023 sonrası kişisel hesaplar). 14 günlük sayaç ancak AAB kapalı teste yüklenip 12 testçi opt-in olunca başlar. **Bu yüzden öncelik: bir an önce imzalı AAB üretip kapalı teste yüklemek ve testçileri davet etmek.** (Bkz. Bölüm 9.)

---

## 0. Sabit Bilgiler (GGHub)

| Alan | Değer |
|------|-------|
| App adı | GGHub |
| Android package | `com.gghub.mobile` (iOS bundle ile aynı) |
| versionCode / versionName | `1` / `1.0.0` |
| min / target SDK | min 24 (Android 7) / target 35 (Android 15) — Expo 55 varsayılanı, Play'in ≥35 şartını karşılar |
| Backend (Railway) | `https://api.gghub.social` |
| Web (Vercel) | `https://gghub.social` |
| Privacy Policy URL | `https://gghub.social/privacy` ✅ herkese açık |
| Terms URL | `https://gghub.social/terms` ✅ |
| **Veri/Hesap silme URL** | `https://gghub.social/data-deletion` ✅ (bu çalışmada eklendi) |
| Destek e-posta | `info@gghub.social` |
| Kategori (öneri) | **Social** |
| Yaş hedefi | 13+ (UGC + mesajlaşma → büyük ihtimal **Teen**) |
| Ödeme / Reklam / Push | **YOK** (v1) |
| Android proje yolu | `~/Documents/SaaS/GGHub/mobile-ui/android` |
| Node | v22.15.0 (nvm) · Expo 55.0.18 |
| EAS projectId | `0f5e5cc1-3810-49e4-954e-7bb23f181e24` |

---

## 1. Kod tarafı — TAMAMLANDI (referans, yeniden yapmana gerek yok)

- ✅ **Google ile giriş Android'de hazır.** `webClientId` configure ediliyor (`SocialAuthButtons.tsx`), buton Android'de görünüyor. Native Google token'ının audience'ı **Web Client ID** olduğundan **backend'de Android için değişiklik GEREKMİYOR** (backend zaten Web Client ID'yi kabul ediyor). Tek gereken: Google Cloud'da **Android OAuth client + SHA-1** (Bölüm 5).
- ✅ **Apple ile giriş Android'de gizli** (`Platform.OS === 'ios'`), Play için sorun yok.
- ✅ **Login/logout** SecureStore tabanlı, sağlam; hesap silme in-app tam (`Profil → Ayarlar → Tehlikeli Alan → DELETE /profile/me`).
- ✅ **İzin temizliği:** `RECORD_AUDIO` app.json'dan çıkarıldı (artık merger `tools:node="remove"` ile final AAB'den siliyor). `SYSTEM_ALERT_WINDOW` `plugins/withRemoveSystemAlertWindow.js` config plugin'i ile release manifest'inden çıkarıldı. Kalan izinler: `INTERNET, CAMERA, READ/WRITE_EXTERNAL_STORAGE (maxSdk 32), VIBRATE` — hepsi gerekçeli. (Temiz prebuild ile doğrulandı.)
- ✅ **Hesap/veri silme web sayfası** `https://gghub.social/data-deletion` eklendi (in-app yol + e-posta talebi + neyin silindiği), footer'dan ve privacy'den erişilebilir. **Google Play, hesap oluşturan uygulamalarda bu URL'i zorunlu tutar.**
- ✅ **Target API 35**, push güvenli no-op (FCM yokken çökmez), ikonlar (1024² + adaptive) yerinde.

> Not: `android/` ve `ios/` gitignore'da (Expo prebuild). Native dosyalar `npx expo prebuild` ile üretilir; bu yüzden imzalama **build.gradle'a değil, Android Studio sihirbazına / keystore'a** dayanır (Bölüm 4, 6).

---

## 2. Kritik Zaman Çizelgesi (kişisel hesap)

```
Gün 0    : Play Console hesabı hazır + imzalı AAB üret + INTERNAL test'e yükle → kendin dene (Google girişi dahil)
Gün 0-1  : CLOSED testing track aç + AAB yükle + 12+ testçiyi davet et → testçiler opt-in + kurar
Gün 1    : ⏱️ 14 GÜNLÜK SAYAÇ BAŞLAR (12 testçi opt-in olduğu an)
... bu sürede: store listing + Data safety + içerik derecelendirme formlarını doldur (Bölüm 8) ...
Gün 15   : "Production access başvurusu" butonu açılır → formu doldur → Google inceler (birkaç gün)
Gün 18+  : Onay → production'a release → mağazada görünür
```

**Çıkarım:** En geç Gün 0-1'de kapalı testi başlatmazsak yayın gecikir. Formlar (Bölüm 8) 14 günü beklerken doldurulabilir.

---

## 3. Ön Hazırlık (👤 SEN)

### 3A. Google Play Developer hesabı
1. https://play.google.com/console → **Create account → Yourself (kişisel)**.
2. **25 USD** tek seferlik ücret (kredi kartı).
3. **Kimlik doğrulama**: Google kişisel hesaplarda kimlik (pasaport/ehliyet) + adres doğrulaması ister. **Bu 1-3 gün sürebilir → hemen başlat.** Doğrulama bitmeden uygulama yayınlayamazsın.
4. Hesap tipi sorulursa: **kişisel** (organization değil).

> ⚠️ Hesap doğrulaması ile 14 günlük test sayacı paralel ilerleyebilir, ama production'a çıkmak için ikisi de bitmiş olmalı. Doğrulamayı geciktirme.

### 3B. Araçlar (Mac'inde)
- **Android Studio** kurulu olmalı (`/Applications/Android Studio.app`). Yoksa: https://developer.android.com/studio → kur → ilk açılışta SDK + "Android SDK Build-Tools" + bir sistem imajı indirsin.
- **JDK**: Android Studio kendi JDK'sını (JBR) getirir; ayrıca kurmana gerek yok.
- `node -v` → **v22.15.0** görmeli (nvm). Görünmüyorsa: `nvm use 22.15.0`.

---

## 4. Keystore + SHA Üretimi (🤝 BİRLİKTE) — "key" kısmı

> 📌 **Mantık (oku, 2 dk):** Uygulamanı imzalamak için bir **keystore** (`.jks`) gerekir. Bu senin **upload key**'in olacak. İlk AAB'yi Play'e yüklediğinde Play **App Signing**'e dahil olacaksın: Google kendi **app signing key**'ini üretir ve kullanıcıların indirdiği uygulamayı **onunla** imzalar; senin keystore'un sadece "yüklerken imzalama" işine yarar. → Google girişinin çalışması için **HEM app signing SHA-1 HEM upload SHA-1** Google Cloud'a girilecek (Bölüm 5). Keystore'u **kaybetme** ve **commit'leme** (`*.jks` zaten gitignore'da).

### 4A. Keystore oluştur (terminal)
```bash
keytool -genkeypair -v \
  -keystore ~/gghub-upload-key.jks \
  -alias gghub-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```
- Sorulan parolayı (store password) gir ve **bir parola yöneticisine kaydet**.
- "What is your first and last name?" → adın veya "GGHub" yazabilirsin (CN). Diğer alanları (org, şehir, ülke TR) doldur.
- Key parolası sorulursa store parolasıyla aynı yapabilirsin (Enter).
- 🔐 **`~/gghub-upload-key.jks` dosyasını + parolaları yedekle** (iCloud/şifre yöneticisi). Kaybedersen Play App Signing ile upload key sıfırlanabilir ama uğraştırır.

### 4B. SHA fingerprint'leri çıkar
```bash
# UPLOAD key (yukarıda ürettiğin)
keytool -list -v -keystore ~/gghub-upload-key.jks -alias gghub-upload

# DEBUG key (kendi cihazında 'expo run:android' ile test için)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```
Çıktıda **SHA1** ve **SHA-256** satırlarını not et. (App signing SHA-1'i Play hesabını kurunca Bölüm 7'de alacağız.)

| SHA kaynağı | Nereden | Ne işe yarar |
|---|---|---|
| **Upload key SHA-1** | 4B (`gghub-upload-key.jks`) | Yüklediğin AAB / yan-yükleme |
| **App signing SHA-1** | Play Console → App integrity (Bölüm 7) | Play'in dağıttığı tüm build'ler (internal/closed/prod) |
| **Debug SHA-1** | 4B (`~/.android/debug.keystore`) | `expo run:android` ile dev test |

---

## 5. Google Cloud — Android OAuth Client (👤/🤝)

> 📌 **Önemli:** Bu, **mevcut Web Client ID ile AYNI Google Cloud projesinde** olmalı (`.env.local`'deki `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`'nin projesi). Android client ID hiçbir yere yazılmaz; sadece Google'ın "bu paket+imza benim tanıdığım uygulama" demesini sağlar. Token'ın audience'ı yine Web Client ID kalır → backend değişmez.

1. https://console.cloud.google.com → doğru projeyi seç (Web Client ID hangi projedeyse).
2. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
3. **Application type: Android**.
   - **Package name:** `com.gghub.mobile`
   - **SHA-1 certificate fingerprint:** Bölüm 4/7'deki SHA-1'i yapıştır.
4. Her SHA-1 için **ayrı bir Android client** oluştur (paket aynı, SHA farklı):
   - (a) **App signing SHA-1** (Play'den — Bölüm 7'de alınca ekle) ← prod/closed/internal için **şart**
   - (b) **Upload key SHA-1** (Bölüm 4B)
   - (c) **Debug SHA-1** (Bölüm 4B) ← `expo run:android` testleri için
5. Kaydet. **Yayılması birkaç dk–saat sürebilir.** Eksikse Google girişi Android'de `DEVELOPER_ERROR` (kod 10) verir → o zaman doğru SHA ekli mi diye bak.

> Not: OAuth consent screen zaten iOS için yayında. Android için ek bir consent ayarı gerekmez.

---

## 6. İmzalı AAB Üretimi (🤝 BİRLİKTE)

> 📌 **KRİTİK — Android Studio'yu MUTLAKA terminalden aç.** Release build sırasında JS bundle'ı gömmek için (`export:embed`) `node` gerekir; Android Studio'yu Finder'dan açarsan nvm'in node'unu **bulamaz** ve build "node not found" ile patlar. Terminalden açınca shell PATH'ini (nvm node) miras alır.

### 6A. Native'i tazele (app.json değiştiyse veya garanti için)
```bash
cd ~/Documents/SaaS/GGHub/mobile-ui
export LANG=en_US.UTF-8
npx expo prebuild --platform android --clean
```
> `.env.local` dosyasının yerinde olduğundan emin ol (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` vb. release bundle'a bu dosyadan gömülür).

### 6B. Android Studio'yu terminalden aç
```bash
node -v   # v22.15.0 görünmeli
cd ~/Documents/SaaS/GGHub/mobile-ui/android && ./gradlew --stop
nohup "/Applications/Android Studio.app/Contents/MacOS/studio" ~/Documents/SaaS/GGHub/mobile-ui/android >/dev/null 2>&1 &
```
- İlk açılışta "Gradle sync" çalışır (bağımlılıklar inebilir, birkaç dk). Bitmesini bekle.

### 6C. Signed Bundle (AAB) üret
1. Üst menü: **Build → Generate Signed App Bundle / APK…**
2. **Android App Bundle** seç → Next.
3. **Key store path:** "Choose existing…" → `~/gghub-upload-key.jks` seç.
   - Key store password / Key alias (`gghub-upload`) / Key password gir (Bölüm 4A).
   - "Remember passwords" işaretleyebilirsin. → Next.
4. Build variant: **release** seç → **Create/Finish**.
5. Çıktı: `~/Documents/SaaS/GGHub/mobile-ui/android/app/build/outputs/bundle/release/app-release.aab`
   - Android Studio sağ altta "locate" linki gösterir.

> Alternatif (CLI): `cd android && ./gradlew bundleRelease` — ama bu build.gradle'daki imzayı kullanır (şu an debug). İlk sürümde **Android Studio sihirbazını** kullan; o, seçtiğin keystore ile imzalar.

---

## 7. Play Console — Uygulama oluştur + Internal Test (👤/🤝)

### 7A. Uygulamayı oluştur
1. https://play.google.com/console → **Create app**.
2. App name: **GGHub** · Default language: **Turkish (tr)** veya English · App or game: **App** · Free or paid: **Free**.
3. Beyanları (declarations) onayla → **Create app**.

### 7B. Play App Signing + App signing SHA-1'i al
1. Sol menü: **Test and release → Setup → App integrity → App signing** (veya ilk AAB yükleyince otomatik teklif edilir → kabul et).
2. Burada **"App signing key certificate"** altındaki **SHA-1** ve **SHA-256**'yı kopyala.
3. → **Bölüm 5'e dön**, bu **app signing SHA-1**'i Google Cloud'a **Android client** olarak ekle. (Google girişinin internal/closed/prod'da çalışması için ŞART.)

### 7C. Internal testing (hızlı kendi testin — 14 güne saymaz)
1. **Test and release → Testing → Internal testing → Create new release**.
2. AAB'yi yükle (`app-release.aab`). İlk yüklemede App Signing'i kabul et.
3. Release adı/notu otomatik gelir → **Next → Save → Review release → Start rollout to Internal testing**.
4. **Testers** sekmesi → kendi Google e-postanı ekle → **opt-in linkini** al, telefonda aç, Play'den kur.
5. ✅ **Smoke test:** açılış, e-posta giriş, **Google ile giriş (uçtan uca)**, ana akış, mesajlaşma, profil foto, hesap silme. Google girişi `DEVELOPER_ERROR` verirse → app signing SHA-1 Google Cloud'a ekli mi + yayıldı mı kontrol et (Bölüm 5).

---

## 8. Store Listing + App Content Formları (👤 SEN)

> 📌 **Genel not:** Sol menüde **"Grow → Store presence → Main store listing"** ve **"Policy and programs → App content"** altındaki TÜM kartlar yeşil ✓ olmalı, yoksa yayına başvuramazsın. 14 günü beklerken bunları doldur.

### 8A. Main store listing (Store presence)
- **App name:** GGHub (≤30 karakter)
- **Short description:** (≤80) örn. "Oyuncular için sosyal platform: listeler, takip, yorum ve sohbet."
- **Full description:** (≤4000) GGHub'ın ne yaptığı (oyun keşfi, listeler, takip, puan/yorum, mesajlaşma, TR/EN). REHBER metni hazırlayabilir.
- **App icon:** **512×512 PNG** (alfa, 1 MB). (`assets/images/icon-beyaz.png` 1024² → 512'ye küçült.)
- **Feature graphic:** **1024×500** PNG/JPG (zorunlu). REHBER/Figma ile üretilebilir.
- **Phone screenshots:** **en az 2** (öneri 4-8), 9:16 dikey (örn. 1080×1920). Ekranlar: Ana akış, Keşfet, Oyun detayı, Listeler, Profil, (giriş ekranı sosyal butonlarla).
  - REHBER emülatör/cihazdan alabilir: `adb exec-out screencap -p > ekran.png`.
- **Categorization:** App category **Social** · Tags ekle.
- **Contact details:** email `info@gghub.social`, website `https://gghub.social`.

### 8B. App content (Policy) — her kartı doldur
1. **Privacy policy:** `https://gghub.social/privacy`
2. **Ads:** "No, my app does not contain ads."
3. **App access:** "All or some functionality is restricted" → **demo hesap** ver:
   - Bir test kullanıcısı kaydet, e-postasını doğrula (veya DB'de `IsEmailVerified=true`). REHBER yapabilir.
   - Instructions: "Email/password login. Demo: <email> / <şifre>. Google/Apple sign-in de mevcut."
4. **Content ratings (IARC anketi):** başlat → kategori "Social/Communication". Sorular:
   - Şiddet/cinsellik/küfür/uyuşturucu: Hayır.
   - **Kullanıcı etkileşimi / kullanıcı içeriği paylaşımı: EVET** (mesajlaşma + yorum/liste).
   - Konum paylaşımı: Hayır · Dijital satın alma: Hayır.
   - → Sonuç büyük ihtimal **Teen / 12+**. Sertifikayı kaydet.
5. **Target audience and content:** Hedef yaş: **13+** (çocuk hedefleme YOK). "Appeal to children": No.
6. **Data safety:** (8C — ayrı bölüm).
7. **News app:** No · **COVID tracing:** No · **Government app:** No · **Financial features:** No · **Health:** No.
8. **Account deletion** (varsa ayrı kart ya da Data safety içinde): **`https://gghub.social/data-deletion`** + "users can delete in-app" → işaretle.

### 8C. Data safety formu (👤 — dikkatli doldur)
> 📌 GGHub'ın gerçek davranışı baz alındı. "Shared" = üçüncü tarafa **satış/paylaşım**; barındırma/kimlik gibi **işleyici (processor)** sağlayıcılar "shared" sayılmaz → hepsinde **No**.

- **Does your app collect or share user data?** → **Yes**.
- **Is all data encrypted in transit?** → **Yes** (HTTPS).
- **Do you provide a way for users to request data deletion?** → **Yes** + URL `https://gghub.social/data-deletion`.
- **Veri türleri** (her biri: Collected = Yes, Shared = No, "Processed ephemerally" = No, Required/Optional, Purpose = App functionality + Account management):
  - **Personal info:** Name, Email address, User IDs → Yes.
  - **Photos and videos:** Photos (profil/header foto) → Yes.
  - **Messages:** Other in-app messages (sohbet) → Yes.
  - **App activity:** App interactions / kullanıcı ürettiği içerik (liste, yorum, puan, takip) → Yes.
  - **App info & performance / Device IDs:** Yalnızca topluyorsan işaretle; emin değilsen minimum tut.
- Kaydet → "Data safety" kartı yeşil ✓ olmalı.

---

## 9. Kapalı Test (Closed testing) — 14 Günü Başlat (👤) ⏱️

> 📌 **Bu bölüm production'a çıkmanın ön şartı.** Internal test 14 güne SAYMAZ; **Closed testing** sayar.

1. **Test and release → Testing → Closed testing → Create track** (veya "Alpha" hazır track'i kullan) → **Create new release**.
2. Aynı AAB'yi yükle (Internal'daki build'i "promote" da edebilirsin) → Save → Review → **Start rollout to Closed testing**.
3. **Testers:** "Create email list" → **en az 12** (öneri **15**, biri çıkarsa sayı düşmesin) Google hesabı e-postası ekle. (Aileden/arkadaştan topladığın 12+ kişi.)
4. **Opt-in URL**'i testçilere gönder. Her testçi:
   - Linki Google hesabıyla açıp **"Become a tester"** der,
   - Play'den uygulamayı **kurar** ve birkaç dk kullanır.
5. ⏱️ **12 testçi opt-in olduğu an 14 günlük kesintisiz sayaç başlar.** Bu süre boyunca 12'nin altına düşme (testçiler opt-out etmesin → bu yüzden 15 davet et).
6. 14 gün dolunca **"Apply for production access"** açılır.

> 🔎 İlerlemeyi **Closed testing → Track** ekranındaki "Testing requirements" / "X of 14 days" göstergesinden takip et.

---

## 10. Production Başvurusu + Submit (👤)

1. 14 gün + 12 testçi tamamlanınca: **Test and release → Production → Apply for production access** (veya Dashboard'daki uyarı).
2. Açılan formda: uygulamayı nasıl test ettiğin, testçi sayısı, hedef kitle, uygulamanın amacı vb. sorulur → dürüst ve net doldur.
3. Google başvuruyu inceler (**birkaç gün**).
4. Onaylanınca: **Production → Create new release** → AAB yükle (veya closed'dan promote) → ülkeler (Çin/Rusya/İran/K.Kore hariç tutabilirsin) → **Review → Start rollout to Production**.
5. İlk yayında ek inceleme olabilir; **1–7 gün** içinde mağazada görünür.

---

## 11. Yayın Sonrası & Güncellemeler

- Landing/web'e **Google Play rozeti/linki** ekle.
- **Sonraki sürüm:** `app.json` → `version` (örn. `1.0.1`) ve `android.versionCode` (örn. `2`) arttır → `npx expo prebuild --platform android --clean` → Android Studio'da yeni signed AAB → Play'de yeni release → "What's new" → rollout. (versionCode her yüklemede **artmalı**.)
- Closed test track'ini açık tutarsan sonraki güncellemeler daha hızlı ilerler.

---

## 12. Red Senaryoları + Hazır Cevaplar (👤/🧭)

| Olası sorun | Hazır cevap / çözüm |
|---|---|
| **Google login `DEVELOPER_ERROR` (kod 10)** | App signing SHA-1 (+upload, +debug) Google Cloud Android client'a ekli mi, doğru projede mi, yayıldı mı? (Bölüm 5/7B) |
| **Build: "node ... not found"** | Android Studio'yu **terminalden** açmadın → Bölüm 6B'deki komutla aç (nvm PATH miras alınır). |
| **UGC moderasyonu (Policy)** | "Raporlama + kullanıcı engelleme + içerik moderasyonu mevcut." |
| **Account deletion zorunluluğu** | In-app silme (Ayarlar → Tehlikeli Alan) + `https://gghub.social/data-deletion` URL'i. |
| **Demo hesap olmadan inceleyemiyoruz** | App access'te doğrulanmış demo hesap + not verildi (Bölüm 8B-3). |
| **Permissions: neden CAMERA?** | Profil/başlık fotoğrafı için. RECORD_AUDIO/SYSTEM_ALERT_WINDOW release'den çıkarıldı. |
| **Data safety uyuşmazlığı** | Form, uygulamanın gerçek topladığıyla bire bir (Bölüm 8C); "satış/paylaşım" yok. |

---

## EK: Faydalı Komutlar & Opsiyonel Polish

**SHA hızlı çıkarma:**
```bash
keytool -list -v -keystore ~/gghub-upload-key.jks -alias gghub-upload | grep -E "SHA1|SHA256"
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA1
```

**Cihazda test (USB, dev):**
```bash
cd ~/Documents/SaaS/GGHub/mobile-ui && npx expo run:android   # debug SHA-1 Google Cloud'da ekliyse Google login de çalışır
```

**Emülatör/cihazdan screenshot:** `adb exec-out screencap -p > ekran.png`

**Opsiyonel iyileştirmeler (bloklamaz, istenirse REHBER yapar):**
- Logout'ta `GoogleSignin.signOut()` → sonraki Google girişinde hesap seçici çıkar (şu an son hesabı otomatik seçer).
- `expo-system-ui` ekle → `userInterfaceStyle: automatic` uyarısı kalkar, native tema tam uygulanır.
- Splash ikonu 719×579 → kare (1024²) yap (kozmetik).
- Android push (FCM `google-services.json`) → v1'de kapsam dışı; iOS ile birlikte ayrı planda.
