#!/usr/bin/env node
/*
 * Mobil surum yukseltme araci.
 * app.json + native (iOS Info.plist & Xcode projesi, Android build.gradle) + package.json
 * dosyalarindaki surum/build numaralarini tek komutla gunceller.
 *
 * Native klasorler (ios/, android/) repoda commit'li ve archive/AAB dogrudan
 * Xcode / Android Studio'dan aliniyor (expo prebuild CALISTIRILMIYOR), bu yuzden
 * native dosyalar da elle guncellenmek zorunda.
 *
 * Kullanim:
 *   npm run bump 1.0.3          -> version 1.0.3; iOS build & Android versionCode otomatik +1
 *   npm run bump 1.0.3 5 7      -> version 1.0.3; iOS build 5; Android versionCode 7
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Hata: gecerli bir surum verin. Ornek: npm run bump 1.0.3 [iosBuild] [androidVersionCode]');
  process.exit(1);
}

const appJsonPath = join(root, 'app.json');
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));

const iosBuild = process.argv[3]
  ? parseInt(process.argv[3], 10)
  : parseInt(appJson.expo.ios.buildNumber, 10) + 1;
const androidVersionCode = process.argv[4]
  ? parseInt(process.argv[4], 10)
  : Number(appJson.expo.android.versionCode) + 1;

if (Number.isNaN(iosBuild) || Number.isNaN(androidVersionCode)) {
  console.error('Hata: iOS build / Android versionCode sayisal olmali.');
  process.exit(1);
}

function edit(relPath, transform) {
  const p = join(root, relPath);
  const before = readFileSync(p, 'utf8');
  const after = transform(before);
  if (before === after) {
    console.warn(`UYARI: ${relPath} degismedi (desen eslesmedi mi?)`);
  }
  writeFileSync(p, after);
}

// 1) app.json (kaynak)
appJson.expo.version = version;
appJson.expo.ios.buildNumber = String(iosBuild);
appJson.expo.android.versionCode = androidVersionCode;
writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// 2) package.json (senkron)
edit('package.json', (s) => s.replace(/("version":\s*")[^"]+(")/, `$1${version}$2`));

// 3) iOS Info.plist
edit('ios/GGHub/Info.plist', (s) =>
  s
    .replace(
      /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${version}$2`,
    )
    .replace(
      /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${iosBuild}$2`,
    ),
);

// 4) iOS Xcode projesi (Debug + Release; tum eslesmeler)
edit('ios/GGHub.xcodeproj/project.pbxproj', (s) =>
  s
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${iosBuild};`),
);

// 5) Android build.gradle
edit('android/app/build.gradle', (s) =>
  s
    .replace(/versionCode\s+\d+/, `versionCode ${androidVersionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`),
);

console.log(`Surum guncellendi:
  marketing version  : ${version}
  iOS build          : ${iosBuild}
  Android versionCode: ${androidVersionCode}

Sonraki adim:
  iOS     -> Xcode'da ios/GGHub.xcworkspace ac -> Archive
  Android -> Android Studio'da android/ ac -> Generate Signed Bundle (AAB)`);
