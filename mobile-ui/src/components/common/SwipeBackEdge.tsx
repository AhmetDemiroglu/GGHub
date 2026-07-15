import React, { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
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
}

/**
 * Sol kenardan sağa çekerek geri gitme jesti.
 * Bottom tab köklerinde sidebar gesture'ı kazanır; detay/alt sayfalarda back çalışır.
 */
export function SwipeBackEdge({ enabled = true }: SwipeBackEdgeProps) {
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
      // Yatay niyeti biraz daha net iste; geniş şeritte dikey scroll'u yanlış yakalamayı azaltır.
      .activeOffsetX(10)
      .failOffsetY([-24, 24])
      .onEnd((event) => {
        if (event.translationX > BACK_DX || event.velocityX > BACK_VELOCITY_X) {
          runOnJS(goBackIfPossible)();
        }
      });
  }, [goBackIfPossible, isEnabled]);

  if (!isEnabled) return null;

  return (
    <GestureDetector gesture={backGesture}>
      <Animated.View style={[styles.edge, { width: edgeWidth }]} />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: 'transparent',
  },
});
