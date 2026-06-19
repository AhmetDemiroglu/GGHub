/**
 * Expo config plugin: removes the SYSTEM_ALERT_WINDOW ("display over other apps")
 * permission from the main (release) AndroidManifest.
 *
 * React Native declares this permission only for the dev error overlay. It is merged
 * into DEBUG builds from React Native's own debug manifest, so `expo run:android`
 * keeps working. Stripping it from the main manifest keeps the production AAB free of
 * an unused sensitive permission that Google Play flags during review.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSION = 'android.permission.SYSTEM_ALERT_WINDOW';

const withRemoveSystemAlertWindow = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = manifest['uses-permission'].filter(
        (perm) => perm?.$?.['android:name'] !== PERMISSION
      );
    }
    return config;
  });
};

module.exports = withRemoveSystemAlertWindow;
