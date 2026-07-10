/**
 * Mobile app store links for GGHub.
 *
 * Both stores are live: iOS on the App Store and Android on Google Play.
 * Every store button reads these URLs; a null URL would render a "coming soon" state.
 */
export const APP_STORE_URL = "https://apps.apple.com/us/app/gghub-games-community/id6781281375";

export const ANDROID_PACKAGE = "com.gghub.mobile";

export const GOOGLE_PLAY_URL: string | null = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** Kept for reference; equals GOOGLE_PLAY_URL now that the listing is live. */
export const GOOGLE_PLAY_URL_WHEN_LIVE = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
