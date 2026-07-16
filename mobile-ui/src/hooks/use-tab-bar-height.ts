import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '@/src/constants/theme';

// AppTabBar yalnızca 5 sekme kökünde render edilir; diğer tüm ekranlar
// root Stack'tedir ve altlarında bar yoktur.
const TAB_ROOTS = ['/', '/discover', '/search', '/lists', '/profile'];

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

/**
 * Ekranın altında içerik için ayrılması gereken boşluk.
 * Sekme köklerinde barın tam yüksekliği; root Stack ekranlarında (bar yok)
 * yalnızca safe-area alt boşluğu döner. Böylece (tabs) dışına taşınan
 * ekranlar ölü 54px padding taşımaz, klavye dock'ları da doğru oturur.
 */
export function useTabBarHeight() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const barInset = useTabBarBottomInset();
  const isTabRoot = TAB_ROOTS.includes(pathname);
  return isTabRoot ? TAB_BAR_CORE_HEIGHT + barInset : insets.bottom;
}
