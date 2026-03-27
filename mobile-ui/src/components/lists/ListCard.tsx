import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import { getImageUrl } from '@/src/utils/image';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { ListCategory, type UserListPublic, type UserList } from '@/src/models/list';

type ListItem = UserListPublic | UserList;

interface ListCardProps {
  list: ListItem;
}

function getCategoryLabel(category: ListCategory, categories: Record<string, string>): string {
  const map: Record<number, string> = {
    [ListCategory.Other]: categories.other,
    [ListCategory.Action]: categories.action,
    [ListCategory.RPG]: categories.rpg,
    [ListCategory.Strategy]: categories.strategy,
    [ListCategory.Shooter]: categories.shooter,
    [ListCategory.Adventure]: categories.adventure,
    [ListCategory.Simulation]: categories.simulation,
    [ListCategory.Sports]: categories.sports,
    [ListCategory.Puzzle]: categories.puzzle,
    [ListCategory.Horror]: categories.horror,
  };
  return map[category] ?? categories.other;
}

function isPublicList(list: ListItem): list is UserListPublic {
  return 'owner' in list;
}

export function ListCard({ list }: ListCardProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const imageUrls = list.firstGameImageUrls?.slice(0, 4) ?? [];

  const ownerName = isPublicList(list) ? list.owner.username : undefined;
  const ownerAvatar = isPublicList(list) ? list.owner.profileImageUrl : undefined;

  const handlePress = () => {
    router.push(`/lists/${list.id}`);
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
    >
      <View style={styles.imageGrid}>
        {[0, 1, 2, 3].map((index) => {
          const url = imageUrls[index] ? getImageUrl(imageUrls[index]) : undefined;
          return (
            <View
              key={index}
              style={[styles.imageCell, { backgroundColor: colors.surfaceHighlight }]}
            >
              {url ? (
                <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
              ) : (
                <Ionicons name="game-controller-outline" size={20} color={colors.textMuted} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {list.name}
          </Text>
          <Badge label={getCategoryLabel(list.category, messages.lists.categories)} />
        </View>

        {ownerName ? (
          <View style={styles.ownerRow}>
            <Avatar uri={ownerAvatar} name={ownerName} size={20} />
            <Text style={[styles.ownerName, { color: colors.textSecondary }]} numberOfLines={1}>
              @{ownerName}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="game-controller" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {list.gameCount} {messages.lists.gamesCount}
            </Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="people" size={14} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {list.followerCount} {messages.lists.followersCount}
            </Text>
          </View>
          {list.averageRating > 0 ? (
            <View style={styles.stat}>
              <Ionicons name="star" size={14} color={colors.star} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {list.averageRating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 120,
  },
  imageCell: {
    width: '50%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    flex: 1,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ownerName: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: FontSize.sm,
  },
});
