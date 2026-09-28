import React from 'react';
import { Platform, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { updateAiInteraction } from '@/src/api/profile';
import { useAiConsent } from '@/src/components/ai/AiConsentProvider';
import { useConfirm } from '@/src/components/common/ConfirmDialog';
import { useToast } from '@/src/components/common/Toast';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';

interface AiInteractionSettingProps {
  /** "card": ayarlar ekranindaki bolum. "compact": mesajlar ekranindaki ince serit. */
  variant?: 'card' | 'compact';
  style?: StyleProp<ViewStyle>;
}

/**
 * "AI hesaplarla etkilesim" ayari. Gizlilik ayarlarinda VE mesajlar ekraninda ayni bilesen.
 *
 * Varsayilan KAPALI. Acmak: anahtar onay penceresini acar (dogum tarihi + riza tiki); anahtar
 * ancak sunucu onayi kaydedince acik gorunur. Kapatmak: ConfirmDialog ile sorulur, riza geri
 * alinir, botlarin takibi kalkar. 18 yas altinda anahtar pasif. Kural sunucuda.
 */
export function AiInteractionSetting({ variant = 'card', style }: AiInteractionSettingProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { profile, open } = useAiConsent();
  const m = messages.ai;

  const mutation = useMutation({
    mutationFn: () => updateAiInteraction({ allow: false, source: Platform.OS === 'ios' ? 'ios' : 'android' }),
    onSuccess: () => {
      showToast('success', m.disabled);
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] });
    },
    onError: () => showToast('error', m.updateError),
  });

  if (!profile) return null;

  const reason = profile.aiInteractionBlockReason ?? null;
  const underage = reason === 'underage';
  const isOn = !reason && profile.allowAiInteraction === true;

  const consentDate = profile.aiConsentAt
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(profile.aiConsentAt))
    : null;

  const note = underage
    ? m.underage
    : isOn
      ? consentDate
        ? m.onSince.replace('{date}', consentDate)
        : null
      : reason === 'needsBirthDate'
        ? m.needsBirthDate
        : m.consentRequired;

  const handleChange = async (next: boolean) => {
    if (next) {
      await open(reason === 'needsBirthDate' ? 'needsBirthDate' : 'consentRequired');
      return;
    }
    const ok = await confirm({
      title: m.disableTitle,
      message: m.disableDescription,
      confirmLabel: m.disableConfirm,
      destructive: true,
    });
    if (ok) mutation.mutate();
  };

  return (
    <View
      style={[
        variant === 'card' ? styles.card : styles.compact,
        {
          borderColor: variant === 'card' ? colors.border : 'rgba(139, 92, 246, 0.35)',
          backgroundColor: variant === 'card' ? 'transparent' : 'rgba(139, 92, 246, 0.06)',
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Ionicons name="hardware-chip-outline" size={16} color="#8b5cf6" />
            <Text style={[styles.title, { color: colors.text }]}>{m.interactionTitle}</Text>
          </View>
          {variant === 'card' ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{m.interactionDescription}</Text>
          ) : null}
        </View>
        <Switch
          value={isOn}
          disabled={underage || mutation.isPending}
          onValueChange={(next) => void handleChange(next)}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={m.interactionTitle}
        />
      </View>
      {note ? (
        <View style={styles.noteBox}>
          <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text>
        </View>
      ) : null}
      {variant === 'card' && isOn ? (
        <Text style={[styles.note, { color: colors.textSecondary, marginTop: 4 }]}>{m.revokeHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  compact: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  texts: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: FontSize.md, fontWeight: '600' },
  description: { fontSize: FontSize.sm, lineHeight: 18 },
  noteBox: { marginTop: Spacing.sm, gap: 4 },
  note: { fontSize: FontSize.xs, lineHeight: 16 },
});
