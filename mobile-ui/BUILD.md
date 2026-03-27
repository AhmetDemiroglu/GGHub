# GGHub Mobile - Build Guide

## Prerequisites
- Node.js 18+, Android Studio, JDK 17, Android SDK 34+

## Setup
```bash
cd mobile-ui && npm install
```

Create `.env`: `EXPO_PUBLIC_API_URL=https://api.gghub.social`

## Development
```bash
npx expo start          # Dev server
npx expo run:android    # Android device/emulator
```

## Release Build (AAB)
1. Keystore: `keytool -genkeypair -v -storetype PKCS12 -keystore android/app/gghub-release.keystore -alias gghub -keyalg RSA -keysize 2048 -validity 10000`
2. Add to `android/gradle.properties`: store/key passwords
3. Add signing config to `android/app/build.gradle`
4. Build: `cd android && ./gradlew bundleRelease`
5. Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Android Studio
Open `android/` folder > Build > Generate Signed Bundle/APK

## Prebuild
`npx expo prebuild --platform android --clean`

## Package ID: `com.gghub.mobile`
