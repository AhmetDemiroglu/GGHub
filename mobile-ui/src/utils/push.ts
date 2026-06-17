import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// How notifications behave while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// getExpoPushTokenAsync needs a real EAS project UUID. The app.json placeholder
// ("gghub-mobile") is not valid; run `eas init` to set extra.eas.projectId, then rebuild.
function getProjectId(): string | undefined {
  const eas = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas;
  const id = eas?.projectId;
  return id && UUID_PATTERN.test(id) ? id : undefined;
}

/**
 * Requests notification permission (shows the iOS prompt) and, when an EAS projectId
 * is configured, returns the Expo push token. Returns null on simulators, when the
 * user denies permission, or before a valid projectId exists. Never throws.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null; // Push is not available on simulators.
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    return null; // Permission granted, but we cannot mint a token without a valid projectId.
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    return null;
  }
}
