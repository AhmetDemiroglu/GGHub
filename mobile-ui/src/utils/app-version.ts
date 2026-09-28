import Constants from 'expo-constants';

/**
 * Uygulamanin kendi surumu (app.json > expo.version, bump script native ile senkron tutar).
 * Android versionName app.json'dan ayrilirsa (bump'in 4. argumani) bu deger Android'de
 * Play'deki surumle uyusmaz; bu yuzden iki platformu ayni surumde tutuyoruz.
 */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}
