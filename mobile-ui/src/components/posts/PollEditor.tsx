import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { POLL_MAX_OPTIONS, POLL_MAX_OPTION_LENGTH, POLL_MIN_OPTIONS } from '@/src/models/post';

export interface PollDraft {
  options: string[];
  durationDays: number;
}

interface PollEditorProps {
  draft: PollDraft;
  onChange: (draft: PollDraft) => void;
  onRemove: () => void;
}

const DURATIONS = [1, 3, 7];

export function PollEditor({ draft, onChange, onRemove }: PollEditorProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  const setOption = (index: number, text: string) =>
    onChange({ ...draft, options: draft.options.map((o, i) => (i === index ? text : o)) });

  return (
    <View style={[styles.wrap, { borderColor: colors.border }]}>
      {draft.options.map((option, index) => (
        <View key={index} style={styles.optionRow}>
          <TextInput
            value={option}
            maxLength={POLL_MAX_OPTION_LENGTH}
            placeholder={messages.posts.poll.optionPlaceholder.replace('{index}', String(index + 1))}
            placeholderTextColor={colors.placeholder}
            onChangeText={(text) => setOption(index, text)}
            style={[
              styles.optionInput,
              { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBackground },
            ]}
          />
          {draft.options.length > POLL_MIN_OPTIONS ? (
            <Pressable
              onPress={() => onChange({ ...draft, options: draft.options.filter((_, i) => i !== index) })}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={styles.footer}>
        {draft.options.length < POLL_MAX_OPTIONS ? (
          <Pressable
            onPress={() => onChange({ ...draft, options: [...draft.options, ''] })}
            style={styles.footerButton}
            hitSlop={6}
          >
            <Ionicons name="add" size={15} color={colors.primary} />
            <Text style={[styles.footerText, { color: colors.primary }]}>
              {messages.posts.poll.addOption}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.durationRow}>
          {DURATIONS.map((days) => {
            const active = draft.durationDays === days;
            return (
              <Pressable
                key={days}
                onPress={() => onChange({ ...draft, durationDays: days })}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: active ? colors.primary : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.durationText, { color: active ? '#ffffff' : colors.textSecondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {messages.posts.poll.duration.replace('{count}', String(days))}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={onRemove} style={styles.footerButton} hitSlop={6}>
          <Text style={[styles.footerText, { color: colors.error }]}>{messages.posts.poll.remove}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginLeft: 'auto',
  },
  durationChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
