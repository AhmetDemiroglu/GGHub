<div align="center">

# 🎮 GGHub

**Oyuncular için Yeni Nesil Sosyal Platform**

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

GGHub, oyuncuların yeni oyunlar keşfetmesi, kişisel listeler oluşturması, inceleme paylaşması ve canlı bir küresel toplulukla bağlantı kurması için tasarlanmış modern, tam yığın bir oyuncu sosyal platformdur. Proje **.NET 8 Clean Architecture** ve **Next.js 15 App Router** ile geliştirilmiştir.

[🌐 Canlı Demo](#) · [🐛 Hata Bildir](https://github.com/ahmetdemiroglu/GGHub/issues) · [✨ Özellik Talep Et](https://github.com/ahmetdemiroglu/GGHub/issues)

</div>

---

## 📑 İçindekiler

- [🚀 Temel Özellikler](#-temel-özellikler)
- [🛠️ Teknoloji Yığını](#️-teknoloji-yığını)
- [🏗️ Mimari Yapı](#-mimari-yapı)
- [🔌 Harici Entegrasyonlar](#-harici-entegrasyonlar)
- [💻 Kurulum](#-kurulum)
- [📱 API Dokümantasyonu](#-api-dokümantasyonu)
- [🗺️ Yol Haritası](#-yol-haritası)
- [🤝 Katkıda Bulunma](#-katkıda-bulunma)
- [� Lisans](#-lisans)

---

## 🚀 Temel Özellikler

### 🔐 Güvenlik & Kimlik Doğrulama
- **JWT Tabalı Kimlik Doğrulama** - Refresh token mekanizması ile güvenli oturum yönetimi
- **E-posta Doğrulama** - Yeni hesaplar için e-posta onayı
- **Şifre Kurtarma** - Güvenli parola sıfırlama akışı
- **Rol Tabanlı Erişim Kontrolü (RBAC)** - Admin, Moderatör ve Kullanıcı rolleri

### 🎮 Oyun Keşfi & Veritabanı
- **RAWG API Entegrasyonu** - 14+ genre ve 11+ platform desteği
- **Akıllı Arama & Filtreleme** - Gelişmiş arama motoru ile detaylı filtreleme seçenekleri
- **Oyun Detay Sayfası** - Metacritic puanları, platform bilgileri, fragmanlar ve ekran görüntüleri
- **Oyun Önerileri** - Benzer oyunlar ve kişiselleştirilmiş öneri sistemi

### 📋 Liste Yönetimi
- **Özel Listeler** - "İstek Listesi", "Oynuyorum", "Bitirdim" ve özel listeler
- **Görünürlük Ayarları** - Her liste için Public/Private/Friends-only seçenekleri
- **Liste Takibi** - Diğer kullanıcıların listelerini takip etme
- **Liste Değerlendirmeleri** - 1-5 yıldız sistemi ile liste puanlama

### 💬 Sosyal Özellikler
- **Takip Sistemi** - Diğer oyuncuları takip ederek içerik akışını özelleştirme
- **İncelemeler & Yorumlar** - Detaylı inceleme yazma ve yorum yapma
- **Oylama Sistemi** - Yorumlar için upvote/downvote desteği
- **Bildirimler** - Takip, yorum, liste etkileşimleri için anlık bildirimler
- **Direkt Mesajlaşma** - Kullanıcılar arası özel konuşmalar

### 📊 Yönetici Paneli
- **Kullanıcı Yönetimi** - Kullanıcıları banlama, rol atama ve profil düzenleme
- **İçerik Moderasyonu** - Raporlanan içerikleri inceleme ve işleme alma
- **Platform İstatistikleri** - Gerçek zamanlı analitikler ve liderlik tabloları
- **İçerik Senkronizasyonu** - Otomatik RAWG ve Metacritic veri senkronizasyonu

### 🏆 Gamification (Oyunlaştırma)
- **Seviye Sistemi** - Kullanıcı deneyim seviyeleri (Novice'dan Critic'e)
- **Rozetler & Başarılar** - Özel başarımlar kazanma
- **Liderlik Tablosu** - En aktif kullanıcıların sıralaması
- **Puan Sistemi** - Etkinlikler için XP kazanma

### 🌍 Çok Dilli Destek
- **Türkçe & İngilizce** - Tam i18n desteği
- **Kolay Genişletilebilir Dil Yapısı** - Yeni dil ekleme desteği

---

## 🛠️ Teknoloji Yığını

### Backend
<div align="center">

| Teknoloji | Açıklama |
|-----------|----------|
| .NET 8.0 | Modern C# framework |
| Entity Framework Core 9 | ORM ve veritabanı yönetimi |
| PostgreSQL | Güçlü ilişkisel veritabanı |
| JWT | Güvenli kimlik doğrulama |
| SignalR | Real-time iletişim |
| Hangfire | Arka plan işleri |
| FluentValidation | Giriş doğrulama |
| Swagger/OpenAPI | API dokümantasyonu |

</div>

### Frontend
<div align="center">

| Teknoloji | Açıklama |
|-----------|----------|
| Next.js 15 | React framework (App Router) |
| React 19 | UI kütüphanesi |
| TypeScript | Tip güvenliği |
| Tailwind CSS v4 | Modern stil çözümü |
| Radix UI | Erişilebilir UI primitivleri |
| TanStack Query | Veri yönetimi ve caching |
| Axios | HTTP istemcisi |
| Zod | Schema doğrulama |
| Shadcn/ui | UI componentleri |
| Embla Carousel | Slider bileşenleri |
| Recharts | Grafikler ve istatistikler |

</div>

---

## 🏗️ Mimari Yapı

GGHub, Clean Architecture prensiplerine sıkı sıkıya bağlı kalarak geliştirilmiştir. Bu yapı, maksimum ölçeklenebilirlik ve bakım kolaylığı sağlar.

```
GGHub/
├── backend/                         # .NET Backend
│   ├── GGHub.Core/                   # Domain katmanı
│   │   ├── Entities/                 # Veritabanı entity'leri (20+)
│   │   ├── Enums/                    # Enum tanımlamaları
│   │   └── Interfaces/               # Core arayüzleri
│   │
│   ├── GGHub.Application/            # Uygulama katmanı
│   │   ├── Dtos/                     # Data Transfer Objects (60+)
│   │   ├── Interfaces/               # Servis arayüzleri
│   │   ├── Services/                 # Business logic
│   │   └── Localization/             # Localization kaynakları
│   │
│   ├── GGHub.Infrastructure/         # Altyapı katmanı
│   │   ├── Persistence/              # EF Core DbContext
│   │   ├── Migrations/              # Database migrations
│   │   ├── Services/                # External service implementations
│   │   ├── Settings/                 # Configuration classes
│   │   └── Utilities/                # Helpers ve utilities
│   │
│   └── GGHub.WebAPI/                 # Web API katmanı
│       ├── Controllers/              # API Controllers (20+)
│       ├── Middleware/               # Custom middleware
│       └── appsettings.json         # Configuration
│
└── ui/                               # Next.js Frontend
    ├── src/
    │   ├── app/                      # Next.js App Router pages
    │   │   ├── (admin)/              # Admin panel sayfaları
    │   │   ├── (authenticated)/     # Authenticated sayfalar
    │   │   └── (unauthenticated)/   # Public sayfalar
    │   │
    │   ├── core/                     # Core bileşenler
    │   │   ├── components/           # 80+ UI componentleri
    │   │   ├── contexts/             # React contexts
    │   │   ├── hooks/                # Custom hooks
    │   │   └── lib/                  # Utilities
    │   │
    │   ├── api/                      # API client modülleri
    │   ├── models/                   # TypeScript tip tanımları
    │   ├── i18n/                     # Internationalization
    │   └── types/                    # Global tipler
    │
    ├── public/                       # Static dosyalar
    └── package.json                  # Frontend dependencies
```

### Backend Katman Detayları

| Katman | Sorumluluk | İçerik |
|--------|------------|--------|
| **GGHub.Core** | Domain mantığı | Entity'ler, Enum'lar, Core Interfaces |
| **GGHub.Application** | Business logic | DTO'lar, Servis Arayüzleri, Validation |
| **GGHub.Infrastructure** | External implementations | EF Core, API servisleri, Email, Storage |
| **GGHub.WebAPI** | HTTP endpoints | Controllers, Middleware, Swagger |

### Frontend Yapı Detayları

| Klasör | Açıklama |
|--------|----------|
| `app/` | Next.js 15 App Router yapısı, route grupları ile segmentasyon |
| `core/components/` | Admin, Game Detail, Home, Search, UI bileşenleri |
| `core/contexts/` | Auth, Locale, SignalR context'leri |
| `api/` | Axios tabanlı API istemcileri |
| `models/` | TypeScript tip tanımları |

---

## 🔌 Harici Entegrasyonlar

<div align="center">

| Servis | Amaç | Durum |
|--------|------|-------|
| **RAWG API** | Oyun veritabanı ve meta veriler | ✅ Aktif |
| **Metacritic** | Eleştirmen puanları ve incelemeleri | ✅ Aktif |
| **Cloudflare R2** | Dosya depolama (resimler, videolar) | ✅ Aktif |
| **SendGrid/SMTP** | E-posta bildirimleri | ✅ Aktif |
| **Google Gemini AI** | İçerik moderation ve öneriler | ✅ Aktif |

</div>

---

## 💻 Kurulum

### Ön Gereksinimler

```
• .NET 8.0 SDK
• Node.js 20+ (LTS)
• PostgreSQL 15+
• RAWG API Key (https://rawg.io/apidocs)
```

### Adım 1: Veritabanı Kurulumu

```bash
# PostgreSQL veritabanı oluştur
createdb gghub_db

# Backend klasörüne git
cd backend

# Migration'ları uygula
cd GGHub.WebAPI
dotnet ef database update
```

> **Not:** `appsettings.Development.json` dosyasında PostgreSQL connection string, JWT secret, RAWG API key ve Cloudflare R2 kimlik bilgilerinizi yapılandırmanız gerekir.

### Adım 2: Backend'i Çalıştırma

```bash
cd backend/GGHub.WebAPI
dotnet run
```

API şu adreste çalışır: `https://localhost:7000`

Swagger dokümantasyonu: `https://localhost:7000/swagger`

### Adım 3: Frontend Kurulumu

```bash
# Frontend klasörüne git
cd ui

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu çalıştır
npm run dev
```

Frontend şu adrette çalışır: `http://localhost:3000`

### Environment Değişkenleri

**.env.local (Frontend)**
```env
NEXT_PUBLIC_API_URL=https://localhost:7000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📱 API Dokümantasyonu

Swagger üzerinden otomatik dokümantasyon mevcuttur: [`https://localhost:7000/swagger`](https://localhost:7000/swagger)

### Öne Çıkan Endpoint'ler

| Kategori | Endpoint | Açıklama |
|----------|----------|----------|
| **Auth** | `POST /api/auth/register` | Yeni kullanıcı kaydı |
| | `POST /api/auth/login` | Giriş yapma |
| | `POST /api/auth/refresh` | Token yenileme |
| | `POST /api/auth/forgot-password` | Şifremi unuttum |
| **Games** | `GET /api/games` | Oyun listesi |
| | `GET /api/games/{id}` | Oyun detayları |
| | `GET /api/games/search` | Oyun arama |
| **Lists** | `GET /api/user-lists` | Kullanıcı listeleri |
| | `POST /api/user-lists` | Liste oluşturma |
| | `PUT /api/user-lists/{id}` | Liste güncelleme |
| | `POST /api/user-lists/{id}/games` | Listeye oyun ekleme |
| **Social** | `POST /api/profiles/{username}/follow` | Kullanıcı takip etme |
| | `GET /api/social/feed` | Sosyal akış |
| | `POST /api/messages` | Mesaj gönderme |
| **Reviews** | `POST /api/reviews` | İnceleme yazma |
| | `POST /api/reviews/{id}/vote` | İncelemeye oy ver |
| **Admin** | `GET /api/admin/dashboard-stats` | Dashboard istatistikleri |
| | `GET /api/admin/users` | Kullanıcı yönetimi |
| | `GET /api/admin/reports` | Rapor yönetimi |

---

## 🗺️ Yol Haritası

### ✅ Tamamlanan Özellikler (v1.0)

- [x] Kullanıcı kimlik doğrulama ve yetkilendirme
- [x] Oyun veritabanı ve arama
- [x] Kişisel oyun listeleri (İstek listesi, Oynuyorum, Bitirdim)
- [x] İnceleme ve puanlama sistemi
- [x] Sosyal takip sistemi
- [x] Direkt mesajlaşma
- [x] Bildirim sistemi
- [x] Yönetici paneli
- [x] Çok dilli destek (TR/EN)
- [x] Gamification sistemi (Seviyeler, Rozetler)
- [x] RAWG ve Metacritic entegrasyonu

### 🚧 Geliştirme Aşamasında

- [ ] SignalR real-time mesajlaşma
- [ ] SignalR anlık bildirimler
- [ ] Docker konteynerizasyonu
- [ ] GitHub Actions CI/CD pipeline

### 🔭 Gelecek Planları (v1.1+)

- [ ] OAuth 2.0 (Google, Steam, Discord)
- [ ] Algoritmik öneri motoru
- [ ] Uzun biçimli oyun rehberleri
- [ ] Topluluk forumları
- [ ] Turnuva ve etkinlik sistemi
- [ ] Mobil uygulama (React Native/Flutter)
- [ ] PWA desteği

---

## 🤝 Katkıda Bulunma

Topluluk katkılarını memnuniyetle karşılıyoruz! Lütfen aşağıdaki adımları izleyin:

1. Repository'yi **fork** edin
2. Özellik branch'i oluşturun (`git checkout -b feature/YeniOzellik`)
3. Değişikliklerinizi **commit** edin (`git commit -m 'Add yeni özellik'`)
4. Branch'inizi **push** edin (`git push origin feature/YeniOzellik`)
5. **Pull Request** açın

Daha detaylı bilgi için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını inceleyebilirsiniz.

---

## 📊 Katkıcılar

<div align="center">

[![Contributors](https://contrib.rocks/image?repo=ahmetdemiroglu/GGHub)](https://github.com/ahmetdemiroglu/GGHub/graphs/contributors)

</div>

---

## 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasını inceleyebilirsiniz.

---

<div align="center">

### 💙 GGHub

*Oyunun Kalbi Burada Atıyor*

---

**Proje Sahibi:** [Ahmet Demiroğlu](https://github.com/ahmetdemiroglu)

📧 [ahmetdemiroglu89@gmail.com](mailto:ahmetdemiroglu89@gmail.com)

</div>
