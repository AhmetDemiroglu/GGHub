import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/common/Avatar';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface ProfileHeaderProps {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  followersCount: number;
  followingCount: number;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  children?: React.ReactNode;
}

export function ProfileHeader({
  username,
  firstName,
  lastName,
  bio,
  status,
  avatarUrl,
  createdAt,
  level = 1,
  xp = 0,
  xpToNextLevel = 100,
  followersCount,
  followingCount,
  onFollowersPress,
  onFollowingPress,
  children,
}: ProfileHeaderProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const h = messages.profile.header;

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;
  const joinDate = new Date(createdAt).toLocaleDateString();
  const xpPercent = xpToNextLevel > 0 ? Math.min((xp / xpToNextLevel) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.banner, { backgroundColor: colors.primary }]} />
      <View style={styles.content}>
        <View style={styles.avatarRow}>
          <Avatar uri={avatarUrl} name={displayName} size={80} />
        </View>

        <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{username}</Text>

        {status ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{status}</Text>
          </View>
        ) : null}

        {bio ? (
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{bio}</Text>
        ) : null}

        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
            <Text style={styles.levelText}>
              Lv. {level}
            </Text>
          </View>
          <View style={styles.xpContainer}>
            <View style={[styles.xpBar, { backgroundColor: colors.surfaceHighlight }]}>
              <View
                style={[
                  styles.xpFill,
                  { backgroundColor: colors.primary, width: `${xpPercent}%` },
                ]}
              />
            </View>
            <Text style={[styles.xpText, { color: colors.textMuted }]}>
              {xp}/{xpToNextLevel} XP
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity onPress={onFollowersPress} style={styles.statItem}>
            <Text style={[styles.statCount, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{h.followersLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onFollowingPress} style={styles.statItem}>
            <Text style={[styles.statCount, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{h.followingLabel}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.joinDate, { color: colors.textMuted }]}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />{' '}
          {h.joinedAt.replace('{date}', joinDate).replace('{appName}', 'GGHub')}
        </Text>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  banner: {
    height: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: -40,
  },
  avatarRow: {
    marginBottom: Spacing.sm,
  },
  displayName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  username: {
    fontSize: FontSize.md,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.sm,
  },
  bio: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  levelText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  xpContainer: {
    flex: 1,
    gap: 2,
  },
  xpBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpText: {
    fontSize: FontSize.xs,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.xxxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statCount: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  joinDate: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
});
