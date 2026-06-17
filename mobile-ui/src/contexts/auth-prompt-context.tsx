import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/use-auth';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Button } from '@/src/components/common/Button';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

type RequireAuthOptions = { message?: string };
type RequireAuth = (action?: () => void, opts?: RequireAuthOptions) => void;

const AuthPromptContext = createContext<{ requireAuth: RequireAuth }>({
  requireAuth: () => {},
});

export function AuthPromptProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const ap = messages.authPrompt;

  const [visible, setVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | undefined>(undefined);

  const requireAuth = useCallback<RequireAuth>(
    (action, opts) => {
      if (isAuthenticated) {
        action?.();
        return;
      }
      setCustomMessage(opts?.message);
      setVisible(true);
    },
    [isAuthenticated],
  );

  const close = () => setVisible(false);
  const navigate = (path: '/(auth)/login' | '/(auth)/register') => {
    close();
    setTimeout(() => router.push(path), 60);
  };

  return (
    <AuthPromptContext.Provider value={{ requireAuth }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceHighlight }]}>
              <Ionicons name="lock-closed-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{ap.title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{customMessage || ap.message}</Text>

            <Button title={ap.signIn} onPress={() => navigate('/(auth)/login')} size="lg" style={styles.btn} />
            <Button title={ap.signUp} onPress={() => navigate('/(auth)/register')} variant="outline" size="lg" style={styles.btn} />
            <Button title={ap.cancel} onPress={close} variant="ghost" size="md" style={styles.btn} />
          </Pressable>
        </Pressable>
      </Modal>
    </AuthPromptContext.Provider>
  );
}

export const useRequireAuth = () => useContext(AuthPromptContext).requireAuth;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  btn: {
    width: '100%',
  },
});
