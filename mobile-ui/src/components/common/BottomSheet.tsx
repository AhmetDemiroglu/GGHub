import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize, BorderRadius, Springs, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 600;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Slight delay so mount happens before animation
      requestAnimationFrame(() => {
        translateY.value = withSpring(0, Springs.smooth);
        overlayOpacity.value = withTiming(1, { duration: 220 });
      });
    } else if (mounted) {
      translateY.value = withSpring(SCREEN_HEIGHT, Springs.smooth);
      overlayOpacity.value = withTiming(0, { duration: 180 });
      const t = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(t);
    }
  }, [visible, mounted, translateY, overlayOpacity]);

  // Pan gesture: handle alanında aşağı sürükleme ile kapatma
  const panGesture = React.useMemo(() => {
    let startY = 0;
    return Gesture.Pan()
      .activeOffsetY(10)
      .failOffsetX(20)
      .onStart(() => {
        'worklet';
        startY = translateY.value;
      })
      .onUpdate((e) => {
        'worklet';
        const next = Math.max(0, startY + e.translationY);
        translateY.value = next;
        overlayOpacity.value = interpolate(
          next,
          [0, SCREEN_HEIGHT * 0.5],
          [1, 0.2],
          Extrapolation.CLAMP,
        );
      })
      .onEnd((e) => {
        'worklet';
        const shouldClose =
          translateY.value > CLOSE_DISTANCE || e.velocityY > CLOSE_VELOCITY;
        if (shouldClose) {
          haptics.impactMedium();
          translateY.value = withSpring(SCREEN_HEIGHT, Springs.smooth);
          overlayOpacity.value = withTiming(0, { duration: 160 });
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(0, Springs.smooth);
          overlayOpacity.value = withTiming(1, { duration: 160 });
        }
      });
  }, [translateY, overlayOpacity, onClose]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheet,
                { backgroundColor: colors.surface },
                Shadows.xl,
                sheetStyle,
              ]}
            >
              {/* Tutamak - drag burada başlar */}
              <View style={styles.handleArea}>
                <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
                {title ? (
                  <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                ) : null}
              </View>
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.sm,
    maxHeight: '80%',
  },
  handleArea: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
});
