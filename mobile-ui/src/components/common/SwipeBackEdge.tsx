import React, { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';

// Sol kenardan jesti yakalayan şeridin ekran genişliğine oranı (~%30).
// Daha önce sabit 44px idi; kullanıcı "biraz daha içeriden" çekebilmek istedi.
const EDGE_WIDTH_RATIO = 0.3;
// Geri gitmek için minimum yatay drag veya hızlı flick
const BACK_DX = 56;
const BACK_VELOCITY_X = 450;
// Navbar (tab) kökleri: bu ekranlarda sol swipe sidebar'a aittir.
const TAB_ROOTS = ['/', '/discover', '/search', '/lists', '/profile'];

interface SwipeBackEdgeProps {
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * Sol kenardan sağa çekerek geri gitme jesti.
 * Bottom tab köklerinde sidebar gesture'ı kazanır; detay/alt sayfalarda back çalışır.
 *
 * İçeriği KAPLAMAZ, SARAR. Daha önce burada absolute + zIndex:1000 transparan bir
 * Animated.View children'ın üstüne basılıyordu; RN'de transparan bir View de hit-test
 * edildiği için o şerit sol %30'daki TÜM dokunmaları yutuyordu (avatar ve kullanıcı adı
 * tam olarak orada duruyor). Jestin aktivasyon alanı artık `hitSlop` ile sınırlanıyor:
 * hareketsiz bir dokunuş Pan'i aktive etmediği için dokunmalar çocuklara ulaşıyor.
 */
export function SwipeBackEdge({ enabled = true, children }: SwipeBackEdgeProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isTabRoot = TAB_ROOTS.includes(pathname);
  const isEnabled = enabled && !isTabRoot;
  const edgeWidth = Math.round(width * EDGE_WIDTH_RATIO);
  const goBackIfPossible = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, []);

  const backGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(isEnabled)
      // Jest yalnızca sol şeritte BAŞLAYABİLİR; şeridin dışı ve hareketsiz dokunuşlar
      // hiç ilgilendirmez, dolayısıyla altdaki Touchable'lara sorunsuz geçer.
      .hitSlop({ left: 0, width: edgeWidth })
      // Yatay niyeti biraz daha net iste; geniş şeritte dikey scroll'u yanlış yakalamayı azaltır.
      .activeOffsetX(10)
      .failOffsetY([-24, 24])
      .onEnd((event) => {
        if (event.translationX > BACK_DX || event.velocityX > BACK_VELOCITY_X) {
          runOnJS(goBackIfPossible)();
        }
      });
  }, [goBackIfPossible, isEnabled, edgeWidth]);

  // Jest kapalıysa hiç sarma: etkilenmeyen ekranlarda layout ağacı bire bir aynı kalsın.
  if (!isEnabled) return <>{children}</>;

  return (
    <GestureDetector gesture={backGesture}>
      <Animated.View style={{ flex: 1 }}>{children}</Animated.View>
    </GestureDetector>
  );
}
