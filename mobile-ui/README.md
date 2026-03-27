# GGHub Mobile

Native mobile app for [GGHub](https://gghub.social) - the social platform for gamers.

Built with **Expo** + **React Native** + **expo-router**.

## Prerequisites

- Node.js 18+
- Android Studio (for Android builds)
- JDK 17
- Android SDK 34+
- An Android device or emulator

## Setup

```bash
# Install dependencies
npm install

# Set API URL (create .env file)
echo "EXPO_PUBLIC_API_URL=https://api.gghub.social" > .env
```

## Development

```bash
# Start Expo dev server
npx expo start

# Run on Android device/emulator
npx expo run:android
```

## Android Build

### Debug APK

```bash
npx expo run:android
```

### Release AAB (for Google Play)

```bash
# 1. Generate Android project
npx expo prebuild --platform android --clean

# 2. Open in Android Studio
# Open the `android/` folder in Android Studio

# 3. Generate signed AAB
# Build > Generate Signed Bundle/APK
# Select AAB
# Create or use existing keystore
# Build release
```

### Signing Configuration

For release builds, create a keystore:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore gghub-release.keystore -alias gghub -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/app/build.gradle` under `signingConfigs`:

```gradle
signingConfigs {
    release {
        storeFile file('gghub-release.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'gghub'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}
```

## Project Structure

```
mobile-ui/
  app/                    # Expo Router screens
    (auth)/               # Login, Register, Forgot/Reset Password
    (tabs)/               # Main tab navigation
      index.tsx           # Home
      discover.tsx        # Game discovery
      messages/           # Conversations & threads
      notifications.tsx   # Notifications
      profile/            # Own profile
    (admin)/              # Admin panel (dashboard, users, reports)
    game/[id].tsx         # Game detail
    lists/                # List discovery & detail
    my-lists.tsx          # My lists
    wishlist.tsx          # Wishlist
    my-reports.tsx        # My reports
    profiles/[username]   # Public profiles
    about.tsx             # About
    terms.tsx             # Terms of service
    privacy.tsx           # Privacy policy
  src/
    api/                  # API service layer (axios)
    components/           # UI components
      common/             # Shared (Button, Card, Avatar, etc.)
      admin/              # Admin components
      discover/           # Discover components
      game/               # Game detail components
      home/               # Home components
      lists/              # List components
      messages/           # Message components
      notifications/      # Notification components
      profile/            # Profile components
      reports/            # Report components
    constants/            # Theme, config
    contexts/             # Auth, Locale, Theme, SignalR
    hooks/                # Custom hooks
    i18n/                 # Internationalization (TR, EN-US)
    models/               # TypeScript models/DTOs
    utils/                # Helpers (image, date, report)
```

## Tech Stack

- **Expo** ~55 (SDK 55)
- **React Native** 0.83
- **expo-router** (file-based routing)
- **@tanstack/react-query** (data fetching)
- **axios** (HTTP client)
- **expo-secure-store** (token storage)
- **@microsoft/signalr** (real-time messaging)
- **expo-image-picker** (profile photo upload)
- **jwt-decode** (token decoding)

## Features

- Full authentication (login, register, forgot/reset password, session restore)
- Proactive token refresh with refresh queue
- Bilingual support (Turkish / English)
- Dark/Light/System theme
- Home feed with hero slider, trending games, leaderboard
- Game discovery with filters
- Game detail with reviews, wishlist, lists
- User lists (create, edit, delete, follow)
- List comments and ratings
- User profiles with activity feed, gamer DNA
- Real-time messaging via SignalR
- Push notifications
- Content reporting system
- Admin panel (dashboard, user management, report management)
- Android-first with iOS-compatible codebase

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.gghub.social` |
