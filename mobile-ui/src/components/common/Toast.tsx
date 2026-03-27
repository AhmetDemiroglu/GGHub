import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: number) => {
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
    <View style={[styles.overlay, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const iconMap: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    info: 'information-circle',
  };

  const colorMap: Record<ToastType, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: colorMap[toast.type],
          opacity,
          transform: [{ translateY }],
        },
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
      <TouchableOpacity
        onPress={() => onDismiss(toast.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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
