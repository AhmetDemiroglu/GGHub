import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
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
  const gw = messages.guestWelcome;

  const [visible, setVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | undefined>(undefined);

  // Card için yumuşak giriş animasyonu — overlay fade ile birlikte
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      cardOpacity.setValue(0);
      cardScale.setValue(0.92);
    }
  }, [visible, cardOpacity, cardScale]);

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
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={close}>
          <Animated.View
            style={{
              width: '100%',
              maxWidth: 380,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            }}
          >
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: '#000',
                },
              ]}
              onPress={() => {}}
            >
              {/* Brand-tinted üst bant */}
              <View style={[styles.headerBand, { backgroundColor: colors.primary + '14' }]}>
                <View style={[styles.headerOrb1, { backgroundColor: colors.primary + '22' }]} />
                <View style={[styles.headerOrb2, { backgroundColor: colors.primary + '18' }]} />
                <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="game-controller" size={28} color="#ffffff" />
                </View>
              </View>

              <View style={styles.body}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {gw?.title ?? ap.title}
                </Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {customMessage ?? gw?.message ?? ap.message}
                </Text>

                <View style={styles.actions}>
                  <Button
                    title={gw?.signUp ?? ap.signUp}
                    onPress={() => navigate('/(auth)/register')}
                    size="lg"
                    style={styles.btn}
                  />
                  <Button
                    title={ap.signIn}
                    onPress={() => navigate('/(auth)/login')}
                    variant="outline"
                    size="lg"
                    style={styles.btn}
                  />
                  <Button
                    title={gw?.continue ?? ap.cancel}
                    onPress={close}
                    variant="ghost"
                    size="md"
                    style={styles.btn}
                  />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </AuthPromptContext.Provider>
  );
}

export const useRequireAuth = () => useContext(AuthPromptContext).requireAuth;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  headerBand: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  headerOrb1: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  headerOrb2: {
    position: 'absolute',
    bottom: -40,
    right: -10,
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  body: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  btn: {
    width: '100%',
  },
});
