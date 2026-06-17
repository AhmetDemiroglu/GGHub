import React from 'react';
import { View, Text, Image, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { formatNumber } from '@/src/utils/format';
import * as haptics from '@/src/utils/haptics';
import type { LeaderboardUser } from '@/src/models/home';

interface LeaderboardCardProps {
  users: LeaderboardUser[];
}

function getRankColor(index: number): string {
  if (index === 0) return '#f59e0b';
  if (index === 1) return '#cbd5e1';
  if (index === 2) return '#cd7f32';
  return '#64748b';
}

function getRankIcon(index: number): keyof typeof Ionicons.glyphMap {
  if (index < 3) return 'trophy';
  return 'medal-outline';
}

function LeaderboardRow({ user, index, isLast }: { user: LeaderboardUser; index: number; isLast: boolean }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const avatarUri = getImageUrl(user.profileImageUrl);
  const rankColor = getRankColor(index);
  const isTop3 = index < 3;
  // Level ismini dile gore goster (backend Turkce sabit donuyor); numaraya gore i18n map,
  // eslesmezse backend stringine dus.
  const localizedLevelName =
    (messages.home.levelNames as Record<string, string>)[String(user.level)] ?? user.levelName;

  const handlePress = () => {
    haptics.impactLight();
    router.push(`/profiles/${user.username}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.rankContainer, { backgroundColor: `${rankColor}1A` }]}>
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
        <Text style={[styles.levelText, { color: colors.textSecondary }]} numberOfLines={1}>
          {localizedLevelName} ({messages.home.level} {user.level})
        </Text>
      </View>
      <View style={styles.xpContainer}>
        <Text style={[styles.xpValue, { color: isTop3 ? rankColor : colors.primary }]}>
          {formatNumber(user.xp)}
        </Text>
        <Text style={[styles.xpLabel, { color: colors.textMuted }]}>
          {messages.home.xp}
        </Text>
      </View>
    </Pressable>
  );
}

export function LeaderboardCard({ users }: LeaderboardCardProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  if (!users.length) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, Shadows.md]}>
      {/* Gradient header for podium feel */}
      <LinearGradient
        colors={[`${colors.primary}26`, `${colors.accent}14`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="trophy" size={22} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          {messages.home.leaderboardTitle}
        </Text>
      </LinearGradient>

      <FlatList
        data={users}
        keyExtractor={(item) => String(item.userId)}
        renderItem={({ item, index }) => (
          <LeaderboardRow
            user={item}
            index={index}
            isLast={index === users.length - 1}
          />
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  listContent: {
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
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
    width: 52,
    height: 28,
    borderRadius: BorderRadius.full,
    gap: 4,
    justifyContent: 'center',
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
