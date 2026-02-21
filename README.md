<div align="center">
  
# 🎮 GGHub

**A Next-Generation Platform for the Gaming Community**

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

GGHub is a modern, full-stack gaming community platform tailored for gamers to discover titles, curate custom lists, share reviews, and connect with a vibrant global community. Built specifically with **.NET 8 Clean Architecture** and **Next.js 15 App Router**.

[Report Bug](https://github.com/ahmetdemiroglu/GGHub/issues) · [Request Feature](https://github.com/ahmetdemiroglu/GGHub/issues)

</div>

---

## ✨ Key Features

### 🛡️ Core System & Security
- **Authentication & Authorization:** Secure JWT-based auth setup with refresh tokens, email verification, and password recovery.
- **Privacy & GDPR:** Profile privacy controls, data export, and account deletion compliance.
- **Admin Dashboard:** Comprehensive user management, content moderation, and platform analytics.

### 🎮 Gaming & Discovery
- **Extensive Database:** Search, filter, and discover games across 14 genres and 11 platforms, powered by the **RAWG API**.
- **Game Details:** Deep dive into game metadata, community ratings, and comprehensive reviews.
- **Custom Game Lists:** Curate, manage, and share personal game collections with customizable visibility settings (Public/Private/Friends-only).

### 💬 Community & Social
- **Interactions:** Follow curated lists, leave ratings (1-5 stars), and participate in threaded comments with voting systems.
- **Social Graph:** Follow/unfollow other gamers and customize your content feed.
- **Direct Messaging:** Private peer-to-peer conversations between individual users.
- **Activity & Notifications:** Stay updated on follows, list interactions, and relevant mentions.

---

## 🏗️ Technical Architecture

GGHub strictly follows a separation of concerns pattern to ensure maximum scalability and maintainability.

### Backend (Clean .NET Architecture)
Our robust C# backend is divided into decoupled layers focusing on core business logic.
- **`GGHub.Core`**: Domain models, entities (17+), and core enums.
- **`GGHub.Application`**: Business rules, use cases, interfaces, and 60+ DTOs.
- **`GGHub.Infrastructure`**: EF Core 9 setup, external API integrations, and generic repositories.
- **`GGHub.WebAPI`**: RESTful endpoints, controllers (15+), and custom middleware.

### Frontend (Next.js App Router)
A blazing-fast, server-rendered React application utilizing modern hooks and UI paradigms.
- **`ui/src/app`**: Complete routing setup split into `(admin)`, `(authenticated)`, and `(unauthenticated)` modules.
- **`ui/src/core`**: 80+ reusable UI components built on standard Radix primitives and Tailwind v4.
- **`ui/src/api`**: Modularized Axios-based API client integrating smoothly with TanStack React Query.

---

## 🚀 Getting Started

Follow these steps to set up a local development environment.

### Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 15+](https://www.postgresql.org/)

### 1. Backend Setup

```bash
# Clone and navigate to the backend
cd backend

# Apply database migrations
cd GGHub.WebAPI
dotnet ef database update

# Run the .NET Server
dotnet run
```

> **Note:** Ensure you configure `appsettings.Development.json` with your localized connection strings, JWT secret, RAWG API key, and Cloudflare R2 credentials. The API will be available at `https://localhost:7000`.

### 2. Frontend Setup

```bash
# Navigate to the frontend
cd ui

# Install node dependencies
npm install

# Run the development server
npm run dev
```

> **Note:** Configure `.env.local` with `NEXT_PUBLIC_API_URL=https://localhost:7000`. The frontend will be available at `http://localhost:3000`.

---

## 📚 API Reference

Comprehensive Swagger documentation is generated automatically and available locally at:
[`https://localhost:7000/swagger`](https://localhost:7000/swagger)

**Highlighted Endpoints:**
- **Auth:** `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`
- **Lists:** `/api/user-lists`, `/api/user-lists/{id}/games`
- **Social:** `/api/profiles/{username}/follow`, `/api/messages`
- **Admin:** `/api/admin/dashboard-stats`, `/api/admin/reports`

---

## 🗺️ Roadmap & Status

### ✅ Completed Milestones
- Functional MVP with Auth, User Profiles, and Game Browsing.
- Complete .NET Backend logic and 90%+ Frontend Integration.
- Game detail, direct messaging, and advanced user lists modules are live.

### 🚧 Current Focus
- Implementing Real-time SignalR notifications and WebSocket messaging.
- Deepening integration testing (Jest + RTL, .NET xUnit).
- Containerization and automated CI/CD deployment pipelines (Docker, GitHub Actions).

### 🔭 Future Vision (v1.1+)
- Advanced algorithmic personalized feeds and recommendation engines.
- Long-form community gaming guides.
- Built-in gamification and progression system.
- OAuth 2.0 Providers (Google, Steam, Discord).

---

## 🤝 Contributing

We welcome community contributions! Please follow the standard flow:
1. **Fork** the repository.
2. Create your **Feature Branch** (`git checkout -b feature/AmazingFeature`).
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4. **Push** to the branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request**.

---

<div align="center">

**Built with ❤️ by [Ahmet Demiroğlu](https://github.com/ahmetdemiroglu)**

📧 [ahmetdemiroglu89@gmail.com](mailto:ahmetdemiroglu89@gmail.com) &nbsp;·&nbsp; 📱 +90 555 713 70 64

*This project is licensed under the [MIT License](LICENSE).*

</div>
