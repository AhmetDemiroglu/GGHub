import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/src/components/common/Avatar';
import { ProfileBannerUploader } from '@/src/components/profile/ProfileBannerUploader';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getImageUrl } from '@/src/utils/image';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface ProfileHeaderProps {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  status?: string | null;
  avatarUrl?: string | null;
  headerImageUrl?: string | null;
  editableBanner?: boolean;
  onBannerUploaded?: (newUrl: string) => void;
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
  headerImageUrl,
  editableBanner = false,
  onBannerUploaded,
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
  const bannerUri = getImageUrl(headerImageUrl);

  return (
    <View style={styles.container}>
      <View style={styles.bannerWrap}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <View style={[styles.bannerFallback, { backgroundColor: colors.primary }]} />
        )}
        {editableBanner && onBannerUploaded ? (
          <View style={styles.bannerEditWrap}>
            <ProfileBannerUploader onUploaded={onBannerUploaded} />
          </View>
        ) : null}
      </View>
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
  bannerWrap: {
    height: 140,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
  },
  bannerEditWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
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
