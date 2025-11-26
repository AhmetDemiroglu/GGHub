# GGHub - Gaming Community Platform

A modern full-stack gaming community platform built with .NET 8.0 and Next.js 15. GGHub allows users to discover games, create and share game lists, write reviews, follow other gamers, and engage with a vibrant gaming community.

[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4-000000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)

## 🎮 Features

### Core Features (Production Ready)
- **User Authentication & Authorization** - JWT-based auth with refresh tokens, email verification, password reset
- **User Profiles** - Customizable profiles with privacy settings, profile photos, GDPR compliance (data export/deletion)
- **Game Discovery** - Search and filter games powered by RAWG API (14 genres, 11 platforms)
- **User Lists** - Create and manage game collections with public/private/friends-only visibility
- **List Interactions** - Follow lists, rate (1-5 stars), comment with nested replies, vote on comments
- **Social Features** - Follow/unfollow users, direct messaging, user blocking
- **Notifications** - Activity notifications (follows, comments, ratings, votes) - Polling based
- **Content Reporting** - Report inappropriate content (users, lists, reviews, comments)
- **Admin Panel** - User management, content moderation, analytics dashboard
- **Search** - Global search across games, users, and lists
- **Game Detail Pages** - Comprehensive game information and reviews (backend ready, frontend in progress)
- **Game Reviews** - Write and vote on game reviews (backend complete, frontend integration pending)


### In Development
- **Real-time Features** - Live notifications and messaging (SignalR)

## 🏗️ Architecture

### Backend (Clean Architecture)
```
backend/
├── GGHub.Core/          # Domain entities, enums (17 entities)
├── GGHub.Application/   # Interfaces, DTOs (60+ DTOs)
├── GGHub.Infrastructure/# Service implementations, EF Core, external APIs
└── GGHub.WebAPI/        # Controllers, middleware (15 controllers, 100+ endpoints)
```

### Frontend (Next.js App Router)
```
ui/src/
├── api/                 # Backend API integration (14 modules)
├── app/                 # Next.js pages and layouts
│   ├── (admin)/         # Admin dashboard
│   ├── (authenticated)/ # Main app pages
│   └── (unauthenticated)/ # Login, register
├── core/
│   ├── components/      # 82+ reusable components
│   ├── contexts/        # React contexts (auth)
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilities (axios, validation)
├── models/              # TypeScript models
└── types/               # Type definitions
```

## 🛠️ Tech Stack

### Backend
- **.NET 8.0** - Modern C# with nullable reference types
- **Entity Framework Core 9.0** - ORM with PostgreSQL
- **PostgreSQL** - Primary database
- **JWT Authentication** - Secure token-based auth with refresh tokens
- **Serilog** - Structured logging
- **Swagger/OpenAPI** - API documentation
- **RAWG Games API** - Game data integration
- **Cloudflare R2** - Image storage (S3-compatible)
- **Resend** - Transactional emails

### Frontend
- **Next.js 15.4** - React framework with App Router
- **React 19.1** - Latest React with server components
- **TypeScript** - Full type safety
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **TanStack React Query** - Server state management
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client with interceptors
- **Sonner** - Toast notifications

## 🚀 Getting Started

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Configure environment variables:**
Create `appsettings.Development.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=gghub;Username=postgres;Password=yourpassword"
  },
  "JwtSettings": {
    "SecretKey": "your-secret-key-min-32-characters",
    "Issuer": "GGHub",
    "Audience": "GGHubUsers",
    "ExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  },
  "RawgApiSettings": {
    "ApiKey": "your-rawg-api-key",
    "BaseUrl": "https://api.rawg.io/api"
  },
  "EmailSettings": {
    "ResendApiKey": "your-resend-api-key",
    "FromEmail": "noreply@yourdomain.com"
  },
  "CloudflareR2Settings": {
    "AccessKey": "your-r2-access-key",
    "SecretKey": "your-r2-secret-key",
    "BucketName": "your-bucket",
    "Endpoint": "https://your-account-id.r2.cloudflarestorage.com"
  }
}
```

3. **Apply database migrations:**
```bash
cd GGHub.WebAPI
dotnet ef database update
```

4. **Run the backend:**
```bash
dotnet run
```
Backend available at `https://localhost:7000`.

---

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd ui
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=https://localhost:7000
NEXT_PUBLIC_GA_ID=your-google-analytics-id
NEXT_PUBLIC_CLARITY_ID=your-clarity-id
```

4. **Run the development server:**
```bash
npm run dev
```
Frontend available at `http://localhost:3000`.

---

## 📚 API Documentation
Swagger UI:
```
https://localhost:7000/swagger
```

### Key Endpoints

#### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

#### User Lists
- `GET /api/user-lists`
- `POST /api/user-lists`
- `POST /api/user-lists/{id}/games`
- `POST /api/user-lists/{id}/follow`

#### Social
- `POST /api/profiles/{username}/follow`
- `GET /api/messages/conversations`
- `POST /api/messages`

#### Admin
- `GET /api/admin/dashboard-stats`
- `GET /api/admin/reports`
- `POST /api/admin/users/{id}/ban`

---

## 🗺️ Roadmap

### Current Status
- ✅ Backend: **100%** complete
- ✅ Frontend: **87%** complete
- ⏳ API Integration: **93%**
- ⏳ Testing: In progress
- ⏳ Deployment Infrastructure: In progress

### Short-term (MVP - 6–8 Weeks)
- Game detail pages
- Game review system
- Frontend testing (Jest + RTL)
- CI/CD pipeline (Docker, GitHub Actions)
- Server-side auth middleware
- Backend unit/integration tests

### Mid-term (v1.1 - 8–12 Weeks)
- Personalized feed
- Recommendation engine
- Real-time messaging and notifications (WebSocket)
- Twitter-like short posts
- Redis caching
- Monitoring/observability

### Long-term (Scaling - 12+ Weeks)
- Long-form guides
- Gamification system
- ML-based recommendations
- Advanced ML moderation
- OAuth providers (Google/Discord/Steam)
- Two-factor auth
- PWA support

---

## 🧪 Testing

### Backend
```bash
cd backend/GGHub.Tests
dotnet test
```

### Frontend
```bash
cd ui
npm test
```

---

## 📦 Project Structure

### Backend Entities
- User
- Game
- UserList
- Review
- Follow
- Message
- Notification
- ContentReport
- UserBlock
- AuditLog
- RefreshToken
- (Join Tables: UserListGame, UserListComment, ReviewVote, UserListRating, etc.)

### Frontend Pages
- Authentication
- Profile
- Lists
- Games
- Messages
- Notifications
- Admin
- Search

---

## 🤝 Contributing
1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push and open Pull Request

---

## 📄 License
MIT License

---

## 👥 Authors
**Ahmet Demiroğlu** – GitHub

---

## 🙏 Acknowledgments
- RAWG API
- Radix UI
- Tailwind CSS
- shadcn/ui

---

## 📞 Contact & Support
- Open a GitHub Issue
- Email: ahmetdemiroglu89@gmail.com
- Phone: +90 555 713 70 64
