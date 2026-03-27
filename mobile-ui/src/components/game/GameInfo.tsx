import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { formatDate } from '@/src/utils/format';
import type { Game } from '@/src/models/game';

interface GameInfoProps {
  game: Game;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.infoValue}>{children}</View>
    </View>
  );
}

function ChipList({ items }: { items: { name: string; slug: string }[] }) {
  const { colors } = useTheme();

  return (
    <View style={styles.chipContainer}>
      {items.map((item) => (
        <View key={item.slug} style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.chipText, { color: colors.text }]}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

export function GameInfo({ game }: GameInfoProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {game.released && (
        <InfoRow label={messages.games.releaseDate}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {formatDate(game.released, locale)}
          </Text>
        </InfoRow>
      )}

      {game.genres.length > 0 && (
        <InfoRow label={messages.games.genres}>
          <ChipList items={game.genres} />
        </InfoRow>
      )}

      {game.platforms.length > 0 && (
        <InfoRow label={messages.games.platforms}>
          <ChipList items={game.platforms} />
        </InfoRow>
      )}

      {game.developers && game.developers.length > 0 && (
        <InfoRow label={messages.games.developers}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {game.developers.map((d) => d.name).join(', ')}
          </Text>
        </InfoRow>
      )}

      {game.publishers && game.publishers.length > 0 && (
        <InfoRow label={messages.games.publishers}>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {game.publishers.map((p) => p.name).join(', ')}
          </Text>
        </InfoRow>
      )}

      {game.esrbRating && (
        <InfoRow label="ESRB">
          <View style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.chipText, { color: colors.text }]}>{game.esrbRating}</Text>
          </View>
        </InfoRow>
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
    gap: Spacing.lg,
  },
  infoRow: {
    gap: Spacing.xs,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoText: {
    fontSize: FontSize.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
});
