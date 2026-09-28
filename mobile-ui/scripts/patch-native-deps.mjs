#!/usr/bin/env node
/**
 * node_modules icindeki native kaynaklara kucuk uyumluluk yamalari. `npm install` sonrasi
 * (postinstall) kendiliginden calisir; yama zaten uygulanmissa hicbir sey yapmaz.
 *
 * 1) expo-router 55, LinkPreviewNativeActionView.swift: UIAction.subtitle kosulsuz kullaniliyor.
 *    Xcode 27 SDK'si bu ozelligi iOS 16 olarak isaretledigi icin uygulama (hedef iOS 15.1)
 *    derlenmiyor, arsiv de alinamiyor. Satir `#available(iOS 16.0, *)` ile sarmalanir; iOS 15'te
 *    yalnizca baglanti onizleme menusundeki alt baslik gorunmez. expo-router bunu duzeltince
 *    bu yama kaldirilabilir (yeni surumde eski metin bulunmazsa betik sessizce gecer).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const patches = [
  {
    file: "node_modules/expo-router/ios/LinkPreview/LinkPreviewNativeActionView.swift",
    from: "    if let subtitle = subtitle {\n      baseUiAction.subtitle = subtitle\n    }",
    to: "    if #available(iOS 16.0, *), let subtitle = subtitle {\n      baseUiAction.subtitle = subtitle\n    }",
  },
];

for (const patch of patches) {
  const path = join(root, patch.file);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  if (source.includes(patch.to)) continue;
  if (!source.includes(patch.from)) {
    console.warn(`[patch-native-deps] Beklenen metin yok, atlandi: ${patch.file}`);
    continue;
  }
  writeFileSync(path, source.replace(patch.from, patch.to));
  console.log(`[patch-native-deps] Yamalandi: ${patch.file}`);
}
