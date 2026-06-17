import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/src/constants/theme';

/**
 * AppTabBar yüksekliği için tek kaynak.
 *
 * Custom AppTabBar position: 'absolute' ile içeriğin üzerine biner; bu yüzden
 * scroll eden ekranların ve FAB'ların alttaki bara çarpmaması için barın
 * gerçek yüksekliğini bilmesi gerekir. Hem AppTabBar hem ekranlar bu hesabı
 * buradan alır ki ikisi her zaman aynı değeri görsün.
 */

// Barın sekme + label bloğunun sabit (safe-area hariç) yüksekliği.
export const TAB_BAR_CORE_HEIGHT = 54;

/**
 * Barın safe-area boşluğu. iOS'ta home-indicator alanı ince durduğu için
 * kısaltılır; Android'de sistem nav bar için tam bırakılır.
 */
export function useTabBarBottomInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios'
    ? Math.max(insets.bottom - 12, Spacing.xs)
    : insets.bottom;
}

/** Barın ekranda kapladığı toplam yükseklik (core + safe-area). */
export function useTabBarHeight() {
  return TAB_BAR_CORE_HEIGHT + useTabBarBottomInset();
}
