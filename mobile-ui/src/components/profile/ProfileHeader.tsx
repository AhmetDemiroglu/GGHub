import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Avatar } from '@/src/components/common/Avatar';
import { ProfileBannerUploader } from '@/src/components/profile/ProfileBannerUploader';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getImageUrl } from '@/src/utils/image';
import { formatNumericDate } from '@/src/utils/date';
import { uploadProfilePhoto } from '@/src/api/photo';
import { Spacing, FontSize, BorderRadius, Springs, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

const AVATAR_SIZE = 88;
// Avatarin banner uzerine binme miktari (yariya yakini banner'da kalir)
const AVATAR_OVERLAP = 44;

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
  editableAvatar?: boolean;
  onAvatarUploaded?: (newUrl: string) => void;
  createdAt: string;
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  followersCount: number;
  followingCount: number;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  /** Avatar satirinin sag ucunda gosterilen aksiyon (X tarzi: Duzenle / Takip et) */
  topRightAction?: React.ReactNode;
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
  editableAvatar = false,
  onAvatarUploaded,
  createdAt,
  level = 1,
  xp = 0,
  xpToNextLevel = 100,
  followersCount,
  followingCount,
  onFollowersPress,
  onFollowingPress,
  topRightAction,
  children,
}: ProfileHeaderProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const h = messages.profile.header;

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username;
  const joinDate = formatNumericDate(createdAt, locale);
  const xpPercent = xpToNextLevel > 0 ? Math.min((xp / xpToNextLevel) * 100, 100) : 0;
  const bannerUri = getImageUrl(headerImageUrl);

  // Yuklenen avatar'i aninda gostermek icin yerel override
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const effectiveAvatar = localAvatar ?? avatarUrl;

  // XP bar animasyon
  const xpProgress = useSharedValue(0);
  useEffect(() => {
    xpProgress.value = withDelay(200, withSpring(xpPercent / 100, Springs.bouncy));
  }, [xpPercent, xpProgress]);

  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(xpProgress.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  const handleFollowersPress = () => {
    haptics.impactLight();
    onFollowersPress?.();
  };
  const handleFollowingPress = () => {
    haptics.impactLight();
    onFollowingPress?.();
  };

  const handlePickAvatar = async () => {
    if (uploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const response = await uploadProfilePhoto(result.assets[0].uri);
      setLocalAvatar(response.profileImageUrl);
      haptics.success();
      onAvatarUploaded?.(response.profileImageUrl);
    } catch {
      // Yukleme basarisiz
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bannerWrap}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerFallback}
          />
        )}
        {editableBanner && onBannerUploaded ? (
          <View style={styles.bannerEditWrap}>
            <ProfileBannerUploader onUploaded={onBannerUploaded} />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatarRing, { backgroundColor: colors.background }]}>
            <Avatar uri={effectiveAvatar} name={displayName} size={AVATAR_SIZE} />
            {editableAvatar ? (
              <TouchableOpacity
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                disabled={uploadingAvatar}
                style={[
                  styles.cameraBadge,
                  { backgroundColor: colors.primary, borderColor: colors.background },
                ]}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons name="camera" size={15} color="#ffffff" />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
          {topRightAction ? <View style={styles.topRightAction}>{topRightAction}</View> : null}
        </View>

        <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{username}</Text>

        {status ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>{status}</Text>
          </View>
        ) : null}

        {bio ? <Text style={[styles.bio, { color: colors.textSecondary }]}>{bio}</Text> : null}

        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: colors.primary }, Shadows.sm]}>
            <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
            <Text style={styles.levelText}>Lv. {level}</Text>
          </View>
          <View style={styles.xpContainer}>
            <View style={[styles.xpBar, { backgroundColor: colors.surfaceHighlight }]}>
              <Animated.View
                style={[styles.xpFill, { backgroundColor: colors.primary }, xpFillStyle]}
              />
            </View>
            <Text style={[styles.xpText, { color: colors.textMuted }]}>
              {xp}/{xpToNextLevel} XP
            </Text>
          </View>
        </View>

        <Text style={[styles.joinDate, { color: colors.textMuted }]}>
          <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />{' '}
          {h.joinedAt.replace('{date}', joinDate).replace('{appName}', 'GGHub')}
        </Text>

        <View style={styles.statsRow}>
          <TouchableOpacity onPress={handleFollowingPress} style={styles.statItem}>
            <Text style={[styles.statCount, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{h.followingLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFollowersPress} style={styles.statItem}>
            <Text style={[styles.statCount, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{h.followersLabel}</Text>
          </TouchableOpacity>
        </View>

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
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: -AVATAR_OVERLAP,
    marginBottom: Spacing.sm,
  },
  avatarRing: {
    borderRadius: (AVATAR_SIZE + 8) / 2,
    padding: 4,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  topRightAction: {
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
    textAlign: 'left',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
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
  joinDate: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statCount: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.sm,
  },
});
