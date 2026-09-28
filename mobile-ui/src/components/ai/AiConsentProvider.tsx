import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { getMyProfile, giveAiConsent } from '@/src/api/profile';
import { DateField } from '@/src/components/common/DateField';
import { useToast } from '@/src/components/common/Toast';
import { useAuth } from '@/src/hooks/use-auth';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { BorderRadius, FontSize, Shadows, Spacing } from '@/src/constants/theme';
import { AI_CONSENT_VERSION } from '@/src/models/profile';
import { registerAiConsentHandler, type AiConsentReason } from '@/src/utils/ai-consent-bridge';

type Pending = { reason: AiConsentReason; resolve: (accepted: boolean) => void };

type AiConsentContextValue = { open: (reason?: AiConsentReason) => Promise<boolean> };

const AiConsentContext = createContext<AiConsentContextValue | null>(null);

/**
 * AI etkilesimi onay penceresinin sahibi (kokte bir kez). Iki giris yolu:
 *   1) axios interceptor: sunucu bota yazmayi 403 ai_consent_required ile reddedince pencere acilir,
 *      onaylanirsa istek tekrarlanir (ai-consent-bridge).
 *   2) useAiConsent().open / ensure: ayarlar karti, bot profilindeki mesaj butonu gibi yerler.
 *
 * Duz RN Modal (Reanimated/Gesture yok): ConfirmDialog ile ayni gerekce, iOS Fabric crash'i.
 */
export function AiConsentProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const open = useCallback(
    (reason: AiConsentReason = 'consentRequired') =>
      new Promise<boolean>((resolve) => {
        pendingRef.current?.resolve(false);
        const next = { reason, resolve };
        pendingRef.current = next;
        setPending(next);
      }),
    [],
  );

  const close = useCallback((accepted: boolean) => {
    pendingRef.current?.resolve(accepted);
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    registerAiConsentHandler(open);
    return () => registerAiConsentHandler(null);
  }, [open]);

  return (
    <AiConsentContext.Provider value={{ open }}>
      {children}
      <AiConsentModal pending={pending} onClose={close} />
    </AiConsentContext.Provider>
  );
}

/** Onay penceresine erisim. ensure(): uygunsa true, degilse pencereyi acar ve sonucunu doner. */
export function useAiConsent() {
  const context = useContext(AiConsentContext);
  const { isAuthenticated } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const reason = profile?.aiInteractionBlockReason ?? null;

  const ensure = useCallback(async () => {
    if (!context || !profile) return false;
    if (!reason) return true;
    if (reason === 'loginRequired') return false;
    return context.open(reason);
  }, [context, profile, reason]);

  return {
    ensure,
    open: context?.open ?? (async () => false),
    profile,
    isAuthenticated,
    eligible: !!profile && !reason,
  };
}

function errorText(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as string | { message?: string } | undefined;
    if (typeof data === 'string' && data.length > 0) return data;
    if (data && typeof data === 'object' && data.message) return data.message;
  }
  return fallback;
}

function AiConsentModal({ pending, onClose }: { pending: Pending | null; onClose: (accepted: boolean) => void }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.aiConsent;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();

  const [accepted, setAccepted] = useState(false);
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
    enabled: isAuthenticated && !!pending,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (pending) {
      setAccepted(false);
      setBirthDate(null);
      setError(null);
    }
  }, [pending]);

  const needsBirthDate = !profile?.dateOfBirth;
  const underage = pending?.reason === 'underage' || profile?.aiInteractionBlockReason === 'underage';

  const mutation = useMutation({
    mutationFn: () =>
      giveAiConsent({
        accept: true,
        textVersion: AI_CONSENT_VERSION,
        source: Platform.OS === 'ios' ? 'ios' : 'android',
        dateOfBirth: needsBirthDate && birthDate ? birthDate.slice(0, 10) : null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['myProfile'], updated);
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
      showToast('success', m.enabled);
      onClose(true);
    },
    onError: (err) => setError(errorText(err, m.error)),
  });

  const canSubmit = accepted && (!needsBirthDate || !!birthDate) && !mutation.isPending;

  return (
    <Modal visible={pending !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => onClose(false)}>
      <Pressable style={styles.backdrop} onPress={() => onClose(false)}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.md]}
          accessibilityViewIsModal
          onPress={() => {}}
        >
          <LinearGradient colors={['#d946ef', '#8b5cf6', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroEmoji}>🤖 💬 🎮</Text>
          </LinearGradient>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {underage ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{m.underageTitle}</Text>
                <Text style={[styles.text, { color: colors.textSecondary }]}>{m.underageText}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{m.title}</Text>
                <Text style={[styles.text, { color: colors.textSecondary }]}>{m.intro}</Text>

                {[
                  { emoji: '🤖', text: m.point1 },
                  { emoji: '🔒', text: m.point2 },
                  { emoji: '📬', text: m.point3 },
                  { emoji: '🔞', text: m.point4 },
                ].map((point) => (
                  <View key={point.emoji} style={styles.point}>
                    <Text style={styles.pointEmoji}>{point.emoji}</Text>
                    <Text style={[styles.pointText, { color: colors.textSecondary }]}>{point.text}</Text>
                  </View>
                ))}

                <Pressable
                  onPress={() => {
                    onClose(false);
                    router.push('/privacy');
                  }}
                  hitSlop={6}
                >
                  <Text style={[styles.link, { color: colors.primary }]}>{m.readMore}</Text>
                </Pressable>

                {needsBirthDate ? (
                  <View style={[styles.box, { borderColor: colors.border }]}>
                    <DateField label={m.birthDateLabel} value={birthDate} onChange={setBirthDate} placeholder={m.birthDatePlaceholder} />
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>{m.birthDateHint}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => setAccepted((value) => !value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: accepted }}
                  style={[styles.checkRow, { borderColor: 'rgba(139, 92, 246, 0.45)', backgroundColor: 'rgba(139, 92, 246, 0.08)' }]}
                >
                  <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.checkText, { color: colors.text }]}>{m.checkbox}</Text>
                </Pressable>

                {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

                <Text style={[styles.hint, { color: colors.textSecondary }]}>{m.footer}</Text>
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {underage ? (
              <Pressable onPress={() => onClose(false)} style={[styles.btn, { backgroundColor: colors.primary }]} accessibilityRole="button">
                <Text style={[styles.btnText, { color: '#ffffff' }]}>{m.close}</Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={() => onClose(false)}
                  style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.btnText, { color: colors.text }]}>{m.cancel}</Text>
                </Pressable>
                <Pressable
                  onPress={() => mutation.mutate()}
                  disabled={!canSubmit}
                  style={[styles.btn, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.45 }]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSubmit }}
                >
                  <Text style={[styles.btnText, { color: '#ffffff' }]}>{m.confirm}</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: { height: 76, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: 30, letterSpacing: 6 },
  scroll: { flexGrow: 0 },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '800' },
  text: { fontSize: FontSize.sm, lineHeight: 20 },
  point: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  pointEmoji: { fontSize: 15, lineHeight: 20 },
  pointText: { flex: 1, fontSize: FontSize.sm, lineHeight: 19 },
  link: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  box: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 6, marginTop: Spacing.xs },
  hint: { fontSize: FontSize.xs, lineHeight: 16 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  checkText: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  error: { fontSize: FontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingTop: Spacing.sm },
  btn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { borderWidth: 1 },
  btnText: { fontSize: FontSize.sm, fontWeight: '700' },
});
