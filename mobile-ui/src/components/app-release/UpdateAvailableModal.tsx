import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { BorderRadius, FontSize, Shadows, Spacing } from '@/src/constants/theme';
import type { AppReleaseCheck } from '@/src/models/app-release';

interface UpdateAvailableModalProps {
  result: AppReleaseCheck | null;
  visible: boolean;
  onDismiss: () => void;
}

/**
 * "Yeni surum yayinda" penceresi (onerilen surum). Kapatilabilir; AppReleaseGate her soguk
 * acilista ve 24 saatte bir yeniden gosterir. Duz RN Modal: ConfirmDialog ile ayni gerekce.
 */
export function UpdateAvailableModal({ result, visible, onDismiss }: UpdateAvailableModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.appRelease;

  const openStore = async () => {
    if (!result) return;
    try {
      await Linking.openURL(result.storeUrl);
    } catch {
      // Magaza acilamadi; pencere acik kalir, kullanici tekrar deneyebilir.
      return;
    }
    onDismiss();
  };

  const isIos = result?.platform === 'ios';

  return (
    <Modal visible={visible && !!result} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.md]}
          accessibilityViewIsModal
          onPress={() => {}}
        >
          <LinearGradient colors={['#6366f1', '#8b5cf6', '#22d3ee']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Ionicons name="rocket" size={30} color="#ffffff" />
          </LinearGradient>

          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]}>{m.updateTitle}</Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>
              {m.updateBody.replace('{version}', result?.recommendedVersion ?? '')}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={onDismiss} accessibilityRole="button" style={[styles.btn, styles.laterBtn, { borderColor: colors.border }]}>
              <Text style={[styles.btnText, { color: colors.text }]}>{m.later}</Text>
            </Pressable>
            <Pressable onPress={openStore} accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.primary }]}>
              <Ionicons name={isIos ? 'logo-apple' : 'logo-google-playstore'} size={16} color="#ffffff" />
              <Text style={[styles.btnText, { color: '#ffffff' }]}>{m.update}</Text>
            </Pressable>
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
    maxWidth: 380,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hero: { height: 84, alignItems: 'center', justifyContent: 'center' },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '800' },
  text: { fontSize: FontSize.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingTop: Spacing.xs },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBtn: { borderWidth: 1 },
  btnText: { fontSize: FontSize.sm, fontWeight: '700' },
});
