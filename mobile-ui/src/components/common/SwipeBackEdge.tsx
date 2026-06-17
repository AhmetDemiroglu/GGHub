import React, { useMemo } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { router } from 'expo-router';

// Sol kenarda jesti yakalayan dar şerit (px)
const EDGE_WIDTH = 24;
// Geri gitmek için minimum yatay drag
const BACK_DX = 80;
// Bu eşiğin üstünde dikey hareket gelirse jest scroll/normal touch sayılıp iptal edilir
const VERTICAL_TOLERANCE = 30;

interface SwipeBackEdgeProps {
  enabled?: boolean;
}

/**
 * Sol kenardan sağa çekerek geri gitme jesti (iOS + Android).
 * Native stack swipe-back'in olmadığı (tab navigator'a kayıtlı) düz ekranlar için
 * router.back() tetikler. Native gesture'lı nested stack ekranlarında kullanılmaz
 * (çift-geri olmaması icin orada `enabled={false}`).
 *
 * pointerEvents="box-none": dokunma alt çocuklara geçer; yalnızca sol kenarda + yatay
 * drag olduğunda PanResponder devreye girer, normal scroll/tıklama bozulmaz.
 */
export function SwipeBackEdge({ enabled = true }: SwipeBackEdgeProps) {
  const responder = useMemo(() => {
    if (!enabled) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: (evt) => evt.nativeEvent.pageX < EDGE_WIDTH,
      onMoveShouldSetPanResponder: (evt, gesture) =>
        evt.nativeEvent.pageX < EDGE_WIDTH &&
        gesture.dx > 5 &&
        Math.abs(gesture.dy) < VERTICAL_TOLERANCE,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > BACK_DX && router.canGoBack()) {
          router.back();
        }
      },
    });
  }, [enabled]);

  if (!responder) return null;
  return <View pointerEvents="box-none" style={styles.edge} {...responder.panHandlers} />;
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    backgroundColor: 'transparent',
  },
});
