import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getMyProfile, updateAiInteraction } from '@/src/api/profile';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import type { AiInteractionBlockReason } from '@/src/models/profile';

interface AiInteractionSettingProps {
  /** "card": ayarlar ekranindaki bolum. "compact": mesajlar ekranindaki ince serit. */
  variant?: 'card' | 'compact';
  style?: StyleProp<ViewStyle>;
}

/**
 * "AI hesaplarla etkilesim" anahtari. Gizlilik ayarlarinda VE mesajlar ekraninda ayni bilesen.
 * Dogum tarihi yoksa ya da 18 yas altindaysa anahtar PASIF (Gemini API sartlari); kural sunucuda
 * (AiInteractionPolicy), burasi yalnizca durumu dogru gosterir.
 */
export function AiInteractionSetting({ variant = 'card', style }: AiInteractionSettingProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const m = messages.ai;

  const { data: profile } = useQuery({ queryKey: ['myProfile'], queryFn: getMyProfile, staleTime: 60_000 });

  const mutation = useMutation({
    mutationFn: (allow: boolean) => updateAiInteraction({ allow }),
    onSuccess: () => {
      showToast('success', m.updated);
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
    onError: () => showToast('error', m.updateError),
  });

  if (!profile) return null;

  const reason = (profile.aiInteractionBlockReason ?? null) as AiInteractionBlockReason | null;
  const locked = reason === 'needsBirthDate' || reason === 'underage';
  const checked = !locked && (profile.allowAiInteraction ?? true);
  const note = reason === 'needsBirthDate' ? m.needsBirthDate : reason === 'underage' ? m.underage : null;

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
          value={checked}
          disabled={locked || mutation.isPending}
          onValueChange={(next) => mutation.mutate(next)}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel={m.interactionTitle}
        />
      </View>
      {note ? (
        <View style={styles.noteBox}>
          <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text>
          {reason === 'needsBirthDate' ? (
            <TouchableOpacity onPress={() => router.push('/profile/edit')} hitSlop={6}>
              <Text style={[styles.link, { color: colors.primary }]}>{m.addBirthDate}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
  link: { fontSize: FontSize.sm, fontWeight: '600' },
});
