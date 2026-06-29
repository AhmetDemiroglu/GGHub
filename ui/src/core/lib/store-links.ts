/**
 * Mobile app store links for GGHub.
 *
 * iOS is live on the App Store. Android (Google Play) is still in review, so
 * GOOGLE_PLAY_URL stays null and every store button renders a "coming soon"
 * state. When the Play listing is approved, set GOOGLE_PLAY_URL to the listing
 * URL (id below) and the buttons become active automatically.
 */
export const APP_STORE_URL = "https://apps.apple.com/app/id6781281375";

export const GOOGLE_PLAY_URL: string | null = null;

export const ANDROID_PACKAGE = "com.gghub.mobile";

/** Convenience: built from ANDROID_PACKAGE once the listing is live. */
export const GOOGLE_PLAY_URL_WHEN_LIVE = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
