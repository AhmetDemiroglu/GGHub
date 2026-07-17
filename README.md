<div align="center">

<img src="ui/public/og/home.png" alt="GGHub, oyuncu sosyal platformu" width="100%">

<br>

# GGHub

**Oyunları keşfet, kendi arşivini oluştur ve oyuncu topluluğuna katıl.**

GGHub; oyun keşfini, kişisel listeleri, incelemeleri ve sosyal etkileşimi tek yerde buluşturan açık kaynaklı bir oyuncu platformudur. Web, iOS ve Android deneyimleri aynı API ve ortak ürün yaklaşımı üzerinde çalışır.

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react)](https://react.dev/)
[![Expo 55](https://img.shields.io/badge/Expo-55-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F5C518?style=flat-square)](LICENSE)

[Canlı platform](https://gghub.social/) · [Mobil uygulama](https://gghub.social/download-app) · [Hata bildir](https://github.com/AhmetDemiroglu/GGHub/issues) · [Özellik öner](https://github.com/AhmetDemiroglu/GGHub/issues)

</div>

## GGHub ne sunuyor?

GGHub, yalnızca oyunların listelendiği bir katalog değil. Bir oyunu keşfetme anından o oyun hakkında konuşmaya, kişisel koleksiyon oluşturmaktan benzer zevklere sahip oyuncularla tanışmaya kadar bütün akışı tek üründe bir araya getirir.

### Oyun keşfi

- RAWG tabanlı geniş oyun kataloğu
- Oyun, platform ve tür odaklı arama ve filtreleme
- Çıkış tarihi, geliştirici, yayıncı, platform, tür, ekran görüntüsü ve video bilgileri
- RAWG ve Metacritic puanlarının birlikte gösterimi
- Benzer oyun önerileri
- Türkçe ve İngilizce oyun açıklamaları
- Web ve mobilde keşif, trend oyunlar ve öne çıkan içerikler

### Listeler ve kişisel arşiv

- İstek listesi ve favoriler
- Kullanıcıya özel oyun listeleri
- Her liste için herkese açık, takipçilere açık veya özel görünürlük
- Listelere oyun ekleme, çıkarma ve sıralı biçimde görüntüleme
- Başka oyuncuların listelerini takip etme
- Listelere yıldız verme, yorum yazma ve yorumları oylama
- Kullanıcı profili üzerinden listelere ve favorilere erişim

### İncelemeler ve topluluk

- Oyunlara puan ve inceleme ekleme
- İncelemeleri düzenleme ve silme
- İncelemelere olumlu veya olumsuz oy verme
- İnceleme yorumları, yanıtlar ve yorum oylama
- Kullanıcı etiketleme ve etkileşime bağlı bildirimler
- İnceleme, kullanıcı, liste ve yorumlar için içerik raporlama

### Sosyal deneyim

- Kullanıcı takip etme ve takipten çıkma
- Kişiselleştirilmiş aktivite akışı
- Tanıyor olabileceğin oyuncular ve kullanıcı önerileri
- Takipçi ve takip edilen listeleri
- Profil fotoğrafı, kapak görseli, biyografi ve sosyal bağlantılar
- Oyuncu DNA grafiği, kullanıcı istatistikleri, seviyeler ve başarımlar
- Kullanıcı engelleme ve profil görünürlüğü ayarları
- Gerçek zamanlı özel mesajlaşma ve okunmamış mesaj sayacı
- Uygulama içi bildirimler, mobil push bildirimleri ve deep link desteği

### Hesap ve gizlilik

- E-posta ve parola ile kayıt ve giriş
- Google ve Apple ile oturum açma
- E-posta doğrulama ve parola sıfırlama
- JWT access token ve refresh token tabanlı oturum yönetimi
- Şifre değiştirme, mesaj izinleri ve profil görünürlüğü ayarları
- Hesap verilerini dışa aktarma
- Hesabı ve ilişkili kullanıcı verilerini silme

### Yönetim ve moderasyon

- Platform istatistikleri ve yönetici paneli
- Kullanıcı arama, rol yönetimi, yasaklama ve yasak kaldırma
- Kullanıcı listeleri, incelemeleri, yorumları ve rapor geçmişi üzerinde inceleme
- Rapor durumunu güncelleme ve kullanıcıya yönetici yanıtı gönderme
- Son kullanıcılar ve son incelemeler için hızlı takip ekranları
- Oyun verisi ve Metacritic senkronizasyon araçları

### Her ekranda aynı ürün

- Next.js tabanlı responsive web uygulaması
- Expo ve React Native tabanlı iOS ve Android uygulaması
- Türkçe ve İngilizce arayüz
- Açık, koyu ve sistem teması
- Web ve mobil arasında ortak hesap, veri ve gerçek zamanlı etkileşim

## Platform yapısı

| Yüzey | Dizin | Sorumluluk |
| --- | --- | --- |
| Web | `ui/` | Next.js App Router ile masaüstü ve mobil web deneyimi |
| Mobil | `mobile-ui/` | Expo Router ile iOS ve Android uygulaması |
| API | `backend/GGHub.WebAPI/` | Kimlik doğrulama, iş kuralları, REST uçları ve SignalR |
| Worker | `backend/GGHub.Worker/` | Katalog senkronizasyonu, veri zenginleştirme ve çeviri işleri |
| Domain | `backend/GGHub.Core/` | Entity, enum ve temel domain sözleşmeleri |
| Uygulama | `backend/GGHub.Application/` | DTO ve servis arayüzleri |
| Altyapı | `backend/GGHub.Infrastructure/` | PostgreSQL, harici servisler ve servis implementasyonları |

## Mimari

Backend, Clean Architecture yaklaşımına göre ayrılmıştır. Domain katmanı dış sistemleri tanımaz; veritabanı ve üçüncü taraf servis detayları Infrastructure katmanında tutulur. Web ve mobil istemciler aynı REST API ile SignalR hub'ını kullanır.

```text
GGHub/
├── backend/
│   ├── GGHub.Core/                # Entity'ler, enum'lar ve domain kuralları
│   ├── GGHub.Application/         # DTO'lar ve servis sözleşmeleri
│   ├── GGHub.Infrastructure/      # EF Core, PostgreSQL ve entegrasyonlar
│   ├── GGHub.WebAPI/              # REST API, SignalR, middleware ve Swagger
│   └── GGHub.Worker/              # Katalog ve veri zenginleştirme işleri
├── ui/                            # Next.js web uygulaması
├── mobile-ui/                     # Expo ve React Native mobil uygulaması
└── scripts/                       # Geliştirici araçları ve migration kontrolleri
```

```text
Web uygulaması ─┐
                ├── REST API + SignalR ── Application ── Core
Mobil uygulama ─┘                            │
                                            └── Infrastructure
                                                  ├── PostgreSQL
                                                  ├── Cloudflare R2
                                                  ├── RAWG / Metacritic
                                                  ├── Resend
                                                  └── Gemini
```

## Teknoloji yığını

| Alan | Teknolojiler |
| --- | --- |
| Backend | .NET 8, ASP.NET Core, Entity Framework Core 9, Npgsql |
| API | REST, Swagger / OpenAPI, JWT, SignalR, rate limiting, response compression |
| Veritabanı | PostgreSQL, code-first migration yapısı |
| Web | Next.js 15, React 19, TypeScript 5, Tailwind CSS 4 |
| Web veri katmanı | TanStack Query, Axios, Zod, React Hook Form |
| Web arayüzü | Radix UI, Recharts, Embla Carousel, Lucide |
| Mobil | Expo SDK 55, React Native 0.83, Expo Router, TypeScript |
| Mobil cihaz özellikleri | Secure Store, push notifications, image picker, haptics, deep linking |
| Gözlemlenebilirlik | Serilog, health endpoint ve yapılandırılmış loglar |
| Dağıtım | Docker tabanlı API imajı, Vercel uyumlu web uygulaması |

## Harici servisler

| Servis | Kullanım alanı |
| --- | --- |
| [RAWG](https://rawg.io/apidocs) | Oyun kataloğu, görseller, platform ve tür verileri |
| Metacritic | Eleştirmen puanları ve katalog zenginleştirme |
| Google Gemini | Oyun açıklaması çevirisi ve kontrollü veri zenginleştirme |
| Cloudflare R2 | Profil fotoğrafı ve kapak görseli depolama |
| Resend | Hesap doğrulama ve parola sıfırlama e-postaları |
| Google Identity | Web ve mobil Google oturumu |
| Sign in with Apple | Web ve iOS Apple oturumu |
| Expo Push Service | iOS ve Android push bildirimleri |

Gemini kullanan işler çağrı ve bütçe limitleriyle çalışır. Katalog işleri API sürecinden ayrıdır; böylece web trafiği ile uzun süren arka plan görevleri birbirini etkilemez.

## Yerel kurulum

### Gereksinimler

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20 LTS](https://nodejs.org/)
- [PostgreSQL 15 veya üzeri](https://www.postgresql.org/download/)
- EF Core CLI: `dotnet-ef`
- Mobil geliştirme için Xcode veya Android Studio
- Oyun verisi için bir [RAWG API anahtarı](https://rawg.io/apidocs)

### 1. Repoyu alın

```bash
git clone https://github.com/AhmetDemiroglu/GGHub.git
cd GGHub
```

### 2. PostgreSQL veritabanını hazırlayın

```bash
createdb gghub
```

Backend ayarları ASP.NET Core yapılandırma sistemi üzerinden okunur. Gizli değerleri repoya yazmak yerine environment variable kullanabilirsiniz:

```bash
export ConnectionStrings__DefaultConnection='Host=localhost;Port=5432;Database=gghub;Username=postgres;Password=your_password'
export JwtSettings__Key='use-a-long-random-secret'
export JwtSettings__Issuer='GGHub'
export JwtSettings__Audience='GGHub'
export RawgApiSettings__BaseUrl='https://api.rawg.io/api'
export RawgApiSettings__ApiKey='your_rawg_api_key'
```

Fotoğraf yükleme, e-posta, sosyal giriş ve çeviri özellikleri için ayrıca ilgili `R2__*`, `ResendSettings__*`, `GoogleAuth__ClientIds__*`, `AppleAuth__ClientIds__*` ve `Gemini__*` değerlerini tanımlayın. ASP.NET Core iç içe ayar adlarında çift alt çizgi kullanır.

### 3. Backend'i çalıştırın

```bash
cd backend
dotnet restore GGHub.sln
dotnet ef database update \
  --project GGHub.Infrastructure \
  --startup-project GGHub.WebAPI
dotnet run --project GGHub.WebAPI --launch-profile https
```

| Adres | Açıklama |
| --- | --- |
| `https://localhost:7263` | API |
| `https://localhost:7263/swagger` | Development ortamında Swagger |
| `https://localhost:7263/health` | Sağlık kontrolü |

Yerel HTTPS sertifikasına güven vermek gerekirse `dotnet dev-certs https --trust` komutunu çalıştırın.

### 4. Web uygulamasını çalıştırın

`ui/.env.local` dosyasını oluşturun:

```env
NEXT_PUBLIC_API_BASE_URL=https://localhost:7263
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_APPLE_SERVICES_ID=
```

Ardından:

```bash
cd ui
npm ci
npm run dev
```

Web uygulaması `http://localhost:3000` adresinde açılır.

### 5. Mobil uygulamayı çalıştırın

`mobile-ui/.env` dosyasını oluşturun:

```env
EXPO_PUBLIC_API_URL=https://api.gghub.social
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

```bash
cd mobile-ui
npm ci
npm start
```

Platforma göre `npm run ios` veya `npm run android` komutunu kullanabilirsiniz. Fiziksel cihazla yerel API'ye bağlanırken `localhost` yerine bilgisayarınızın yerel ağ adresini kullanın.

### Docker ile API

Docker imajı repository kökünden oluşturulur:

```bash
docker build -f backend/Dockerfile -t gghub-api .
docker run --rm -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection='your_connection_string' \
  -e JwtSettings__Key='your_jwt_secret' \
  gghub-api
```

Container içindeki API `http://localhost:8080` adresinden erişilebilir.

## API yüzeyi

Swagger, Development ortamında bütün istek ve yanıt modellerini gösterir. Temel gruplar aşağıdaki gibidir:

| Alan | Rota | İçerik |
| --- | --- | --- |
| Kimlik | `/api/auth` | Kayıt, giriş, Google, Apple, token yenileme ve parola işlemleri |
| Oyunlar | `/api/games` | Keşif, detay, çeviri ve benzer oyunlar |
| Ana sayfa | `/api/home` | Hero içeriği, trendler ve topluluk verileri |
| Arama | `/api/search` | Oyun, kullanıcı, mesaj ve mention araması |
| Listeler | `/api/user-lists` | Liste CRUD, oyunlar, takip, favoriler ve istek listesi |
| Liste etkileşimi | `/api/UserListComments`, `/api/UserListRatings` | Yorumlar, oylar ve yıldızlar |
| İncelemeler | `/api/reviews`, `/api/ReviewComments` | İnceleme, puan, yorum ve oy işlemleri |
| Profiller | `/api/profile`, `/api/profiles` | Profil, takip, engelleme, gizlilik ve veri dışa aktarma |
| Aktivite | `/api/activity`, `/api/stats`, `/api/gamification` | Akış, kullanıcı istatistikleri ve başarımlar |
| Mesajlar | `/api/messages` | Konuşmalar, mesaj dizileri ve okunmamış sayısı |
| Bildirimler | `/api/notification` | Bildirim merkezi ve push token yönetimi |
| Raporlar | `/api/report` | İçerik raporlama ve kullanıcının rapor geçmişi |
| Yönetim | `/api/admin`, `/api/analytics` | Moderasyon, kullanıcı yönetimi ve analitik |
| Gerçek zamanlı | `/hubs/chat` | SignalR mesaj ve bildirim kanalı |

## Arka plan worker'ı

`GGHub.Worker`, uzun süren katalog işlerini Web API sürecinden ayrı çalıştırır. RAWG ve Metacritic senkronizasyonu, eksik oyun detaylarını tamamlama ve açıklama çevirileri bu katmanda yürütülür.

macOS için yönetim scripti:

```bash
./scripts/gghub-bot install
./scripts/gghub-bot status
./scripts/gghub-bot logs
```

Worker ayar şablonu `backend/GGHub.Worker/appsettings.example.json` dosyasındadır. Gerçek ayarlar varsayılan olarak `~/.gghub-bot/appsettings.json` altında tutulur ve repository içine alınmaz.

## Geliştirici akışı

Entity değişiklikleri ile EF Core migration'larının uyumlu kalması için repository içinde bir kontrol scripti bulunur:

```bash
./scripts/check-migrations
```

Kontrolü her push öncesinde otomatik çalıştırmak için:

```bash
./scripts/install-hooks
```

Temel doğrulama komutları:

```bash
dotnet build backend/GGHub.sln
npm --prefix ui run build
cd mobile-ui && npx tsc --noEmit
```

## Katkıda bulunma

Katkılar memnuniyetle karşılanır. Başlamadan önce açık [issue'lara](https://github.com/AhmetDemiroglu/GGHub/issues) göz atabilir veya yapmak istediğiniz değişikliği yeni bir issue ile paylaşabilirsiniz.

1. Repository'yi fork edin.
2. Değişikliğiniz için ayrı bir branch açın.
3. İlgili backend, web veya mobil doğrulamalarını çalıştırın.
4. Ne değiştiğini ve nasıl test edildiğini anlatan bir pull request gönderin.

GGHub üzerinde çalışmalar aktif biçimde sürüyor. Yeni özellikler eklerken yalnızca özellik sayısını artırmaya değil, oyun keşfini ve topluluk deneyimini gerçekten iyileştirmeye odaklanıyoruz.

## Lisans

GGHub, [MIT Lisansı](LICENSE) ile yayımlanır.

<div align="center">

**Oyunun kalbi burada atıyor.**

[Ahmet Demiroğlu](https://github.com/AhmetDemiroglu) · [gghub.social](https://gghub.social/)

</div>
