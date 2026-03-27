import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { gameApi } from '@/src/api/game';
import type { Game } from '@/src/models/game';

interface GameDescriptionProps {
  game: Game;
}

const MAX_LINES = 5;

export function GameDescription({ game }: GameDescriptionProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const translateMutation = useMutation({
    mutationFn: () => gameApi.translate(game.id),
    onSuccess: (data) => {
      queryClient.setQueryData(['game', game.slug], (old: Game | undefined) => {
        if (!old) return old;
        return { ...old, descriptionTr: data.descriptionTr };
      });
    },
  });

  const descriptionText =
    locale === 'tr' && game.descriptionTr
      ? game.descriptionTr
      : game.description;

  if (!descriptionText) return null;

  const showTranslateButton = locale === 'tr' && !game.descriptionTr;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{messages.games.description}</Text>

      <Text
        style={[styles.description, { color: colors.textSecondary }]}
        numberOfLines={expanded ? undefined : MAX_LINES}
      >
        {descriptionText}
      </Text>

      <Pressable onPress={() => setExpanded(!expanded)} style={styles.toggleButton}>
        <Text style={[styles.toggleText, { color: colors.primary }]}>
          {expanded ? messages.games.showLess : messages.games.showMore}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.primary}
        />
      </Pressable>

      {showTranslateButton && (
        <Pressable
          style={[styles.translateButton, { borderColor: colors.primary }]}
          onPress={() => translateMutation.mutate()}
          disabled={translateMutation.isPending}
        >
          {translateMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="language" size={18} color={colors.primary} />
          )}
          <Text style={[styles.translateText, { color: colors.primary }]}>
            {translateMutation.isPending
              ? messages.games.translating
              : messages.games.translateToTurkish}
          </Text>
        </Pressable>
      )}

      {locale === 'tr' && game.descriptionTr && (
        <View style={styles.translatedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.translatedText, { color: colors.success }]}>
            {messages.games.translated}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  toggleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  translateText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  translatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  translatedText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
