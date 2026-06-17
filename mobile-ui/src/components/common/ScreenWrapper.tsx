import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  PanResponder,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing } from '@/src/constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  safeArea?: boolean;
  noPadding?: boolean;
  edges?: string[];
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * iOS'a özel sol kenardan sağa çekerek geri gitme jesti. Default açık.
   * Tab navigator screen'lerinde (hidden tabs) native Stack swipe-back
   * çalışmadığı için bu wrapper devreye girer.
   */
  swipeBackEnabled?: boolean;
}

// Sol kenarda jesti yakalayan dar şerit (px)
const EDGE_WIDTH = 24;
// Geri gitmek için minimum yatay drag
const BACK_DX = 80;
// Bu eşiğin üstünde dikey hareket gelirse jest scroll/normal touch sayılıp iptal edilir
const VERTICAL_TOLERANCE = 30;

export function ScreenWrapper({
  children,
  safeArea = true,
  noPadding = false,
  edges,
  style,
  swipeBackEnabled = true,
}: ScreenWrapperProps) {
  const { colors } = useTheme();

  const swipeResponder = useMemo(() => {
    if (Platform.OS !== 'ios' || !swipeBackEnabled) return null;
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
  }, [swipeBackEnabled]);

  const containerStyle: ViewStyle[] = [
    styles.container,
    { backgroundColor: colors.background },
    !noPadding && { paddingHorizontal: Spacing.md },
  ].filter(Boolean) as ViewStyle[];

  // pointerEvents="box-none" — dokunma alt çocuklara geçer; sadece pan responder
  // gesture'ı yakalayacak duruma gelirse (sol kenarda + yatay drag) absorb eder.
  // Bu sayede sol kenarda da normal scroll/tıklama bozulmaz.
  const edgeOverlay = swipeResponder ? (
    <View
      pointerEvents="box-none"
      style={styles.edgeOverlay}
      {...swipeResponder.panHandlers}
    />
  ) : null;

  if (safeArea) {
    const safeAreaProps: any = {
      style: [containerStyle, style],
    };
    if (edges) {
      safeAreaProps.edges = edges;
    }
    return (
      <SafeAreaView {...safeAreaProps}>
        {children}
        {edgeOverlay}
      </SafeAreaView>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      {children}
      {edgeOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  edgeOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: EDGE_WIDTH,
    // Görsel olarak görünmez; sadece dokunmatik alanı yakalar.
    backgroundColor: 'transparent',
  },
});
