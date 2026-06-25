import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { BorderRadius, FontSize, Spacing, Shadows } from '@/src/constants/theme';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive (error) color. */
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/**
 * Imperative confirmation dialog — a drop-in replacement for `Alert.alert`
 * confirmations. Returns a promise that resolves to `true` (confirmed) or
 * `false` (cancelled / dismissed).
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title, message, destructive: true })) { ...do it... }
 *
 * Built on a plain RN `Modal` + `Pressable` (no Reanimated/Gesture Handler)
 * to avoid the iOS Fabric crash the team hit when animating inside Modals.
 */
export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={options !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => resolve(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => resolve(false)}>
          {/* Inner Pressable absorbs touches so taps on the card don't dismiss. */}
          <Pressable
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              Shadows.md,
            ]}
            accessibilityViewIsModal
            onPress={() => {}}
          >
            {options ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{options.title}</Text>
                {options.message ? (
                  <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {options.message}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => resolve(false)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.btn,
                      styles.cancelBtn,
                      { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.btnText, { color: colors.text }]}>
                      {options.cancelLabel ?? messages.common.cancel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => resolve(true)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.btn,
                      {
                        backgroundColor: options.destructive ? colors.error : colors.primary,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.btnText, { color: '#ffffff' }]}>
                      {options.confirmLabel ?? messages.common.confirm}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
