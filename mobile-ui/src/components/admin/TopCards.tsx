import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Avatar } from '@/src/components/common/Avatar';
import { analyticsAdminApi } from '@/src/api/analytics-admin';

export function TopCards() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.admin;

  const { data: topUsers } = useQuery({
    queryKey: ['admin', 'top-users'],
    queryFn: () => analyticsAdminApi.getTopUsers(5),
  });

  const { data: topLists } = useQuery({
    queryKey: ['admin', 'top-lists'],
    queryFn: () => analyticsAdminApi.getTopLists(5),
  });

  const { data: topGames } = useQuery({
    queryKey: ['admin', 'top-games'],
    queryFn: () => analyticsAdminApi.getTopGames(5),
  });

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{m.topUsersTitle}</Text>
        </View>
        {topUsers?.map((user, index) => (
          <View key={user.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rank, { color: colors.textMuted }]}>#{index + 1}</Text>
            <Avatar uri={user.profileImageUrl} name={user.username} size={28} />
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
              {user.username}
            </Text>
            <Text style={[styles.itemStat, { color: colors.textSecondary }]}>
              {user.reviewCount} {m.reviewCount}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={20} color={colors.success} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{m.topListsTitle}</Text>
        </View>
        {topLists?.map((list, index) => (
          <View key={list.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rank, { color: colors.textMuted }]}>#{index + 1}</Text>
            <View style={styles.listInfo}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {list.name}
              </Text>
              <Text style={[styles.itemSubtext, { color: colors.textMuted }]}>
                {list.ownerUsername}
              </Text>
            </View>
            <Text style={[styles.itemStat, { color: colors.textSecondary }]}>
              {list.followerCount} {m.followerCount}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="game-controller" size={20} color={colors.warning} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{m.topGamesTitle}</Text>
        </View>
        {topGames?.map((game, index) => (
          <View key={game.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <Text style={[styles.rank, { color: colors.textMuted }]}>#{index + 1}</Text>
            <View style={styles.listInfo}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {game.name}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={colors.star} />
              <Text style={[styles.itemStat, { color: colors.textSecondary }]}>
                {game.averageRating.toFixed(1)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  rank: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 24,
  },
  listInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  itemSubtext: {
    fontSize: FontSize.xs,
  },
  itemStat: {
    fontSize: FontSize.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
