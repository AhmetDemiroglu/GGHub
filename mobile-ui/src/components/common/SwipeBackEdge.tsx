import React, { useCallback, useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Springs } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

// Jestin BAŞLAYABILECEĞI sol dilim: X gibi ekranın ~%30'u, tek elle tam erişim.
const EDGE_WIDTH_RATIO = 0.3;
// Bırakınca geri gitme eşiği (ekran oranı) ve hızlı flick eşiği.
const COMMIT_RATIO = 0.34;
const COMMIT_VELOCITY_X = 700;
// Navbar (tab) kökleri: bu ekranlarda sol swipe sidebar'a aittir.
const TAB_ROOTS = ['/', '/discover', '/search', '/lists', '/profile'];

interface SwipeBackEdgeProps {
  /**
   * Ekran bazında jesti kapatma kapısı (ör. kendi yatay pan'i olan ekranlar).
   * iOS'ta bu bileşen zaten devre dışıdır: native stack jesti
   * (fullScreenGestureEnabled) gerçek önceki sayfayı canlı gösterir, custom
   * kopya hem gereksiz hem çift-pop riskidir. Android'de react-native-screens
   * jest desteklemez; oradaki TEK geri jesti budur ve `enabled` false değilse
   * her zaman açıktır.
   */
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Android için X-benzeri interaktif geri jesti: sayfa parmağı 1:1 izler,
 * eşiği geçince hafif haptic + ekran dışına akıp `router.back()`, eşik altı
 * bırakışta yaylanarak yerine oturur. Sol %30'luk dilimde başlar; dikey
 * scroll'u bozmasın diye yatay niyet eşiği ve dar failOffsetY kullanır.
 */
export function SwipeBackEdge({ enabled = true, children }: SwipeBackEdgeProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isTabRoot = TAB_ROOTS.includes(pathname);
  const isEnabled = enabled && !isTabRoot && Platform.OS !== 'ios';
  const edgeWidth = Math.round(width * EDGE_WIDTH_RATIO);

  const translateX = useSharedValue(0);
  const crossedThreshold = useSharedValue(false);

  const goBackIfPossible = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, []);

  const thresholdHaptic = useCallback(() => {
    haptics.impactLight();
  }, []);

  const backGesture = useMemo(() => {
    const commitPx = width * COMMIT_RATIO;

    return Gesture.Pan()
      .enabled(isEnabled)
      // Jest yalnızca sol dilimde BAŞLAYABİLİR; dilim dışı ve hareketsiz
      // dokunuşlar altındaki Touchable'lara aynen geçer.
      .hitSlop({ left: 0, width: edgeWidth })
      .activeOffsetX(12)
      .failOffsetY([-18, 18])
      .onUpdate((event) => {
        // Sola sürüklemeye izin yok; sayfa yalnızca sağa kayar.
        translateX.value = Math.max(0, event.translationX);

        const crossed = translateX.value > commitPx;
        if (crossed !== crossedThreshold.value) {
          crossedThreshold.value = crossed;
          if (crossed) runOnJS(thresholdHaptic)();
        }
      })
      .onEnd((event) => {
        const shouldCommit =
          translateX.value > commitPx ||
          (event.velocityX > COMMIT_VELOCITY_X && translateX.value > 24);

        if (shouldCommit) {
          // Sayfayı akışında ekran dışına gönder, sonra gerçekten geri git.
          translateX.value = withTiming(width, { duration: 160 }, (finished) => {
            if (finished) runOnJS(goBackIfPossible)();
          });
        } else {
          translateX.value = withSpring(0, Springs.smooth);
          crossedThreshold.value = false;
        }
      });
  }, [isEnabled, edgeWidth, width, translateX, crossedThreshold, goBackIfPossible, thresholdHaptic]);

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    // Kayarken hafif gölge hissi: sayfa kenarı belirginleşsin.
    shadowOpacity: interpolate(translateX.value, [0, 40], [0, 0.25]),
  }));

  // Jest kapalıysa hiç sarma: etkilenmeyen ekranlarda layout ağacı bire bir aynı kalsın.
  if (!isEnabled) return <>{children}</>;

  return (
    <GestureDetector gesture={backGesture}>
      <Animated.View
        style={[
          { flex: 1, shadowColor: '#000', shadowOffset: { width: -6, height: 0 }, shadowRadius: 12 },
          pageStyle,
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
