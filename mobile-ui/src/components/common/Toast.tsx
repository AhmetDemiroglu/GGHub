import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { BorderRadius, FontSize, Spacing, Springs, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev.slice(-2), { id, type, title, message }]);

    // Haptics on show
    if (type === 'success') haptics.success();
    else if (type === 'error') haptics.error();
    else haptics.impactLight();

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    haptics.impactLight();
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastOverlay toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastOverlay({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.overlay, { top: insets.top + Spacing.sm }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-30);
  const translateX = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSpring(1, Springs.smooth);
    translateY.value = withSpring(0, Springs.smooth);
  }, [opacity, translateY]);

  // Swipe-to-dismiss gesture
  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(20)
        .failOffsetY(15)
        .onUpdate((e) => {
          'worklet';
          translateX.value = e.translationX;
          opacity.value = interpolate(
            Math.abs(e.translationX),
            [0, 150],
            [1, 0.3],
            Extrapolation.CLAMP,
          );
        })
        .onEnd((e) => {
          'worklet';
          if (Math.abs(e.translationX) > 100 || Math.abs(e.velocityX) > 800) {
            translateX.value = withTiming(e.translationX > 0 ? 400 : -400, { duration: 200 });
            opacity.value = withTiming(0, { duration: 200 });
            runOnJS(onDismiss)(toast.id);
          } else {
            translateX.value = withSpring(0, Springs.snappy);
            opacity.value = withSpring(1, Springs.smooth);
          }
        }),
    [translateX, opacity, onDismiss, toast.id],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  const iconMap: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'close-circle',
    info: 'information-circle',
  };

  const colorMap: Record<ToastType, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: colorMap[toast.type],
          },
          Shadows.md,
          animatedStyle,
        ]}
      >
        <Ionicons name={iconMap[toast.type]} size={20} color={colorMap[toast.type]} />
        <View style={styles.toastContent}>
          <Text style={[styles.toastTitle, { color: colors.text }]}>{toast.title}</Text>
          {toast.message ? (
            <Text style={[styles.toastMessage, { color: colors.textSecondary }]}>
              {toast.message}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onDismiss(toast.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    gap: Spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.sm,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  toastMessage: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
