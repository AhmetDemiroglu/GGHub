import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { useUserLink } from '@/src/components/common/UserLink';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import { followUser, unfollowUser } from '@/src/api/social';
import { displayName } from '@/src/utils/display-name';
import type { SuggestedUser } from '@/src/models/social';
import * as haptics from '@/src/utils/haptics';

interface PeopleYouMayKnowProps {
  suggestions: SuggestedUser[];
}

const CARD_WIDTH = 150;

export function PeopleYouMayKnow({ suggestions }: PeopleYouMayKnowProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { canOpen, openProfile } = useUserLink();
  const pymk = messages.home.pymk;

  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [followState, setFollowState] = useState<Record<number, boolean>>({});
  const [pending, setPending] = useState<Set<number>>(new Set());

  const followMutation = useMutation({ mutationFn: (username: string) => followUser(username) });
  const unfollowMutation = useMutation({ mutationFn: (username: string) => unfollowUser(username) });

  const handleToggleFollow = useCallback(
    async (item: SuggestedUser) => {
      if (pending.has(item.id)) return;
      const isFollowing = followState[item.id] ?? false;
      haptics.impactLight();

      // İyimser güncelleme: arayüzü hemen çevir, hata olursa geri al.
      setFollowState((prev) => ({ ...prev, [item.id]: !isFollowing }));
      setPending((prev) => new Set(prev).add(item.id));

      try {
        if (isFollowing) {
          await unfollowMutation.mutateAsync(item.username);
        } else {
          await followMutation.mutateAsync(item.username);
        }
      } catch {
        setFollowState((prev) => ({ ...prev, [item.id]: isFollowing }));
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [followState, pending, followMutation, unfollowMutation],
  );

  const reasonLabel = useCallback(
    (item: SuggestedUser): { icon: keyof typeof Ionicons.glyphMap; text: string; color: string } => {
      if (item.followsYou) {
        return { icon: 'person-add', text: pymk.followsYou, color: colors.success };
      }
      if (item.reason === 'mutual' && item.mutualFollowerCount > 0) {
        return { icon: 'people', text: pymk.mutual.replace('{count}', String(item.mutualFollowerCount)), color: colors.primary };
      }
      if (item.reason === 'taste' && item.sharedGameCount > 0) {
        return { icon: 'game-controller', text: pymk.taste.replace('{count}', String(item.sharedGameCount)), color: colors.star };
      }
      return { icon: 'flame', text: pymk.popular, color: colors.textSecondary };
    },
    [pymk, colors],
  );

  const renderItem = useCallback(
    ({ item }: { item: SuggestedUser }) => {
      const isFollowing = followState[item.id] ?? false;
      const name = displayName(item);
      const reason = reasonLabel(item);
      const isPending = pending.has(item.id);
      const profileOpenable = canOpen(item);

      return (
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows.sm]}>
          <Pressable
            style={styles.dismissBtn}
            hitSlop={8}
            onPress={() => setDismissed((prev) => new Set(prev).add(item.id))}
          >
            <Ionicons name="close" size={14} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.cardTop}
            disabled={!profileOpenable}
            onPress={() => {
              haptics.impactLight();
              openProfile(item);
            }}
          >
            <Avatar uri={item.profileImageUrl} name={name} size={60} />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
              @{item.username}
            </Text>
          </Pressable>

          <View style={styles.reasonRow}>
            <Ionicons name={reason.icon} size={11} color={reason.color} />
            <Text style={[styles.reasonText, { color: reason.color }]} numberOfLines={1}>
              {reason.text}
            </Text>
          </View>

          <Pressable
            style={[
              styles.followBtn,
              isFollowing
                ? { backgroundColor: 'transparent', borderColor: colors.border }
                : { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            disabled={isPending}
            onPress={() => handleToggleFollow(item)}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.background} />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'person-add'}
                  size={13}
                  color={isFollowing ? colors.text : colors.background}
                />
                <Text style={[styles.followText, { color: isFollowing ? colors.text : colors.background }]}>
                  {isFollowing ? pymk.following : pymk.follow}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      );
    },
    [colors, followState, pending, reasonLabel, handleToggleFollow, canOpen, openProfile, pymk],
  );

  const visible = suggestions.filter((s) => !dismissed.has(s.id));
  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>{pymk.title}</Text>
      </View>
      <FlatList
        data={visible}
        renderItem={renderItem}
        keyExtractor={(item) => `pymk-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  dismissBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    padding: 2,
  },
  cardTop: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.sm,
    maxWidth: '100%',
  },
  handle: {
    fontSize: FontSize.xs,
    marginTop: 1,
    maxWidth: '100%',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.sm,
    maxWidth: '100%',
  },
  reasonText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    flexShrink: 1,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    width: '100%',
    marginTop: Spacing.sm,
  },
  followText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
