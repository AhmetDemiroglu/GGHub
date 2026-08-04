import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Avatar } from '@/src/components/common/Avatar';
import { getImageUrl } from '@/src/utils/image';
import { analyticsAdminApi } from '@/src/api/analytics-admin';

/**
 * Dashboard'in uc siralama karti: en cok takip edilen kullanicilar, en populer
 * listeler, en yuksek puanli oyunlar. Web'deki top-users/top-lists/top-games
 * kartlarinin mobil karsiligi ve ayni i18n anahtarlarini kullanir.
 */
export function TopCards() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  const topUsersQuery = useQuery({
    queryKey: ['admin', 'top-users'],
    queryFn: () => analyticsAdminApi.getTopUsers(5),
  });

  const topListsQuery = useQuery({
    queryKey: ['admin', 'top-lists'],
    queryFn: () => analyticsAdminApi.getTopLists(5),
  });

  const topGamesQuery = useQuery({
    queryKey: ['admin', 'top-games'],
    queryFn: () => analyticsAdminApi.getTopGames(5),
  });

  const topUsers = topUsersQuery.data ?? [];
  const topLists = topListsQuery.data ?? [];
  const topGames = topGamesQuery.data ?? [];

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="people" size={20} color={colors.primary} />
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{m.topUsersTitle}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{m.topUsersDescription}</Text>
          </View>
        </View>
        {topUsers.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{m.topUsersNoData}</Text>
        ) : (
          topUsers.map((user, index) => (
            <TouchableOpacity
              key={user.userId}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/(admin)/users/${user.userId}`)}
            >
              <Text style={[styles.rank, { color: colors.textMuted }]}>#{index + 1}</Text>
              <Avatar uri={user.profileImageUrl} name={user.username} size={28} />
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {user.username}
              </Text>
              <Text style={[styles.itemStat, { color: colors.textSecondary }]}>
                {m.topUsersFollowers.replace('{count}', String(user.followerCount))}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="list" size={20} color={colors.success} />
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{m.topListsTitle}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{m.topListsDescription}</Text>
          </View>
        </View>
        {topLists.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{m.topListsNoData}</Text>
        ) : (
          topLists.map((list, index) => (
            <TouchableOpacity
              key={list.listId}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/lists/${list.listId}`)}
            >
              <Text style={[styles.rank, { color: colors.textMuted }]}>#{index + 1}</Text>
              <View style={styles.listInfo}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {list.listName}
                </Text>
                <Text style={[styles.itemSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                  {m.topListsCreatedBy.replace('{username}', list.ownerUsername)}
                </Text>
              </View>
              <View style={styles.trailing}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={12} color={colors.star} />
                  <Text style={[styles.itemStat, { color: colors.textSecondary }]}>
                    {list.averageRating.toFixed(1)}
                  </Text>
                </View>
                <Text style={[styles.itemSubtext, { color: colors.textMuted }]}>
                  {m.topListsFollowers.replace('{count}', String(list.followerCount))}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="game-controller" size={20} color={colors.warning} />
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{m.topGamesTitle}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{m.topGamesDescription}</Text>
          </View>
        </View>
        {topGames.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{m.topGamesNoData}</Text>
        ) : (
          topGames.map((game, index) => (
            <TouchableOpacity
              key={game.gameId}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
              // slug yoksa rawgId: /games/{idOrSlug} ucu SAYIYI RawgId olarak
              // cozuyor, ic Id ile eslesmez (web kartinda da ayni sira var).
              onPress={() => router.push(`/game/${game.slug || game.rawgId}`)}
            >
              <Text style={[styles.rank, { color: colors.textMuted }]}>#{index + 1}</Text>
              {getImageUrl(game.gameImageUrl) ? (
                <Image source={{ uri: getImageUrl(game.gameImageUrl) }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, { backgroundColor: colors.surfaceHighlight }]} />
              )}
              <View style={styles.listInfo}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {game.gameName}
                </Text>
                <Text style={[styles.itemSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                  {m.topGamesReviews.replace('{count}', String(game.reviewCount))}
                </Text>
              </View>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color={colors.star} />
                <Text style={[styles.itemStat, { color: colors.textSecondary }]}>
                  {game.averageRating.toFixed(1)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
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
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
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
  cover: {
    width: 28,
    height: 38,
    borderRadius: BorderRadius.sm,
  },
  listInfo: {
    flex: 1,
    minWidth: 0,
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
  trailing: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
