import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { formatNumber } from '@/src/utils/format';
import type { LeaderboardUser } from '@/src/models/home';

interface LeaderboardCardProps {
  users: LeaderboardUser[];
}

function getRankColor(index: number): string {
  if (index === 0) return '#f59e0b';
  if (index === 1) return '#94a3b8';
  if (index === 2) return '#cd7f32';
  return '#64748b';
}

function getRankIcon(index: number): keyof typeof Ionicons.glyphMap {
  if (index < 3) return 'trophy';
  return 'medal-outline';
}

export function LeaderboardCard({ users }: LeaderboardCardProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  if (!users.length) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {messages.home.leaderboardTitle}
      </Text>
      {users.map((user, index) => {
        const avatarUri = getImageUrl(user.profileImageUrl);
        const rankColor = getRankColor(index);

        return (
          <View
            key={user.userId}
            style={[styles.row, index < users.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
          >
            <View style={styles.rankContainer}>
              <Ionicons name={getRankIcon(index)} size={16} color={rankColor} />
              <Text style={[styles.rankText, { color: rankColor }]}>#{index + 1}</Text>
            </View>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={16} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                {user.username}
              </Text>
              <Text style={[styles.levelText, { color: colors.textSecondary }]}>
                {user.levelName} ({messages.home.level} {user.level})
              </Text>
            </View>
            <View style={styles.xpContainer}>
              <Text style={[styles.xpValue, { color: colors.primary }]}>
                {formatNumber(user.xp)}
              </Text>
              <Text style={[styles.xpLabel, { color: colors.textMuted }]}>
                {messages.home.xp}
              </Text>
            </View>
          </View>
        );
      })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
    gap: 4,
  },
  rankText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  levelText: {
    fontSize: FontSize.xs,
  },
  xpContainer: {
    alignItems: 'flex-end',
  },
  xpValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  xpLabel: {
    fontSize: FontSize.xs,
  },
});
