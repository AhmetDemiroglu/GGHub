# GGHub - Oyuncular için Modern bir Sosyal Platform

[![.NET Build](https://github.com/github/docs/actions/workflows/build.yml/badge.svg)
[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GGHub, oyun severlerin oyunları keşfetmesi, kendi listelerini oluşturması, yorum yapması ve diğer oyuncularla etkileşime girmesi için tasarlanmış modern bir sosyal platformdur. Bu repo, projenin hem backend hem de frontend kodlarını barındıran bir monorepo'dur.

## 🚧 Projenin Mevcut Durumu

* **Backend (V1.0): TAMAMLANDI ✔️**
    * Projenin tüm backend altyapısı .NET 8 kullanılarak, profesyonel standartlara uygun, ölçeklenebilir ve güvenli bir katmanlı mimari ile tamamlanmıştır. API, bir frontend uygulamasının ihtiyaç duyacağı tüm özellikleri sunmaya hazırdır. Detaylar için aşağıdaki bölümlere bakabilirsiniz.

* **Frontend: PLANLAMA AŞAMASINDA ⏳**
    * Platformun kullanıcı arayüzü, **React (Next.js)** kullanılarak geliştirilecektir. Backend hazır olduğuna göre, geliştirme süreci yakında başlayacaktır.

## 🛠️ Teknoloji Yığını

### Backend (.NET 8)

* **Framework:** ASP.NET Core 8
* **Mimari:** Katmanlı Mimari (Core, Application, Infrastructure, WebAPI)
* **Veritabanı:** Entity Framework Core 8 (Geliştirme: SQLite, Üretim: PostgreSQL)
* **Kimlik Doğrulama:** JWT (AccessToken & RefreshToken)
* **Loglama:** Serilog ile Yapısal Loglama
* **E-posta:** MailKit
* **API Test & Dokümantasyon:** Swashbuckle (Swagger)
* **Güvenlik:** Dahili Rate Limiting, Rol Bazlı Yetkilendirme

### Frontend (Planlanan)

* **Framework:** Next.js
* **Dil:** TypeScript
* **UI Kütüphanesi:** React
* **Stil:** Tailwind CSS
* **Veri Çekme & State Management:** TanStack Query (React Query)
* **UI Bileşenleri:** Shadcn/ui

## 📂 Repo Yapısı

Bu proje, backend ve frontend kodlarını aynı çatı altında toplayan bir monorepo yapısı kullanır:

```
/GGHub
├── /backend/         # Tüm .NET backend kodu burada
│   ├── GGHub.sln
│   ├── /src/
│   │   ├── GGHub.Core/
│   │   ├── GGHub.Application/
│   │   ├── GGHub.Infrastructure/
│   │   └── GGHub.WebAPI/
├── /frontend/        # (Yakında) Next.js frontend kodu burada olacak
└── README.md         # Bu dosya
```

## 🚀 Başlarken (Backend Kurulumu)

Backend API'sini lokal makinenizde çalıştırmak için:

1.  **.NET 8 SDK**'nın yüklü olduğundan emin olun.
2.  Bu repoyu klonlayın: `git clone https://github.com/kullanici-adiniz/GGHub.git`
3.  `backend/src/GGHub.WebAPI/` klasörünün içine `appsettings.Development.json` adında bir dosya oluşturun ve aşağıdaki şablonu kendi bilgilerinizle doldurun:

    ```json
    {
      "RawgApiSettings": {
        "ApiKey": "SIZIN_RAWG_API_ANAHTARINIZ",
        "BaseUrl": "[https://api.rawg.io/api/](https://api.rawg.io/api/)"
      },
      "JwtSettings": {
        "Key": "BURAYA_COK_GUVENLI_RASTGELE_BIR_ANAHTAR_GIRIN",
        "Issuer": "[https://gghub.local](https://gghub.local)",
        "Audience": "[https://gghub.local](https://gghub.local)"
      },
      "EmailSettings": {
        "Host": "smtp.gmail.com",
        "Port": 587,
        "FromName": "GGHub Destek",
        "FromAddress": "GONDEREN_GMAIL_ADRESINIZ@gmail.com",
        "AppPassword": "GOOGLE_UYGULAMA_SIFRENIZ"
      }
    }
    ```
4.  Paket Yöneticisi Konsolu'nu açın (`Default project: GGHub.Infrastructure`) ve veritabanını oluşturmak için şu komutu çalıştırın:
    ```powershell
    Update-Database
    ```
5.  `GGHub.WebAPI` projesini çalıştırın. API artık `https://localhost:XXXX` adresinde Swagger arayüzü ile birlikte hazır olacaktır.

## 🗺️ Backend Yol Haritası (Tamamlanan Modüller)

Backend, aşağıdaki 12 modülün tamamını kapsayacak şekilde geliştirilmiştir:
- ✅ **Modül 1:** Gelişmiş Kullanıcı Profili
- ✅ **Modül 2:** Liste Yönetimini Tamamlama
- ✅ **Modül 3:** Gözlemlenebilirlik & Denetim Kaydı
- ✅ **Modül 4:** Gelişmiş Güvenlik ve Oturum Yönetimi
- ✅ **Modül 5:** Oran Sınırlandırma & Kötüye Kullanım Koruması
- ✅ **Modül 6:** Gelişmiş Keşif Özellikleri
- ✅ **Modül 7:** İçerik Moderasyonu & Raporlama
- ✅ **Modül 8:** Yönetim Paneli API'si (Admin)
- ✅ **Modül 9:** Bildirim Altyapısı
- ✅ **Modül 10:** Sosyal Etkileşim (Takip, Mesajlaşma, Engelleme)
- ✅ **Modül 11:** Gelişmiş Arama & Dizinleme
- ✅ **Modül 12:** Gizlilik & Veri Yaşam Döngüsü (Hesap Silme, Veri İndirme)

---
