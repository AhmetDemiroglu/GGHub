import React, { memo, useCallback, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Avatar } from '@/src/components/common/Avatar';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { formatRelativeTime } from '@/src/utils/date';
import { displayName } from '@/src/utils/display-name';
import * as haptics from '@/src/utils/haptics';
import { voteReview } from '@/src/api/review';
import { emitReviewVote, voteTransition } from '@/src/utils/review-vote-bus';
import { Activity, ActivityType, ActivityActor } from '@/src/models/activity';

interface FeedCardProps {
  activity: Activity;
}

/** X tarzı kart başlığı: aktör avatarı + ad soyad (bold) + @username + · zaman. */
function CardHeader({ actor, occurredAt }: { actor?: ActivityActor | null; occurredAt: string }) {
  const { colors } = useTheme();
  const { locale } = useLocale();
  const router = useRouter();
  const timeAgo = formatRelativeTime(occurredAt, locale);

  if (!actor) {
    return <Text style={[styles.time, { color: colors.textSecondary }]}>{timeAgo}</Text>;
  }

  const name = displayName(actor);

  return (
    <Pressable
      style={styles.headerRow}
      onPress={() => {
        haptics.impactLight();
        router.push(`/profiles/${actor.username}`);
      }}
    >
      <Avatar uri={actor.profileImageUrl} name={actor.username} size={38} />
      <View style={styles.headerText}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
          @{actor.username} · {timeAgo}
        </Text>
      </View>
    </Pressable>
  );
}

function ReviewCard({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const review = activity.reviewData!;
  const pendingRef = useRef(false);

  const openReview = useCallback(() => {
    haptics.impactLight();
    router.push(`/reviews/${review.reviewId}`);
  }, [router, review.reviewId]);

  // Kalp = +1 oy toggle'ı (X beğenisi). Kendi incelemene backend oy vermez.
  const isOwnReview = !!user && activity.actor?.id === Number(user.id);
  const isLiked = review.myVote === 1;

  const toggleLike = useCallback(async () => {
    if (!user || isOwnReview || pendingRef.current) return;
    pendingRef.current = true;
    haptics.impactLight();

    const transition = voteTransition(review.myVote ?? null, 1);
    // İyimser: tüm sekmelerdeki kopyalar bus üzerinden anında güncellenir.
    emitReviewVote({ reviewId: review.reviewId, ...transition });

    try {
      await voteReview(review.reviewId, { value: 1 });
    } catch {
      // Geri al.
      emitReviewVote({
        reviewId: review.reviewId,
        likeDelta: -transition.likeDelta,
        scoreDelta: -transition.scoreDelta,
        myVote: review.myVote ?? null,
      });
    } finally {
      pendingRef.current = false;
    }
  }, [user, isOwnReview, review.reviewId, review.myVote]);

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={openReview}>
      <CardHeader actor={activity.actor} occurredAt={activity.occurredAt} />

      <View style={styles.reviewBody}>
        <View style={styles.gameThumbWrap}>
          {getImageUrl(review.game.coverImage || review.game.backgroundImage) ? (
            <Image
              source={{ uri: getImageUrl(review.game.coverImage || review.game.backgroundImage)! }}
              style={styles.gameThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.gameThumb, { backgroundColor: colors.surfaceHighlight }]} />
          )}
        </View>
        <View style={styles.reviewContent}>
          <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={1}>
            {review.game.name}
          </Text>
          <View style={[styles.ratingPill, { backgroundColor: colors.star + '22' }]}>
            <Ionicons name="star" size={11} color={colors.star} />
            <Text style={[styles.ratingText, { color: colors.star }]}>{review.rating}/10</Text>
          </View>
          {review.contentSnippet ? (
            <Text style={[styles.snippet, { color: colors.textSecondary }]} numberOfLines={2}>
              “{review.contentSnippet}”
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Pressable
          style={styles.statItem}
          onPress={toggleLike}
          disabled={isOwnReview || !user}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={15}
            color={isLiked ? colors.error : colors.textSecondary}
          />
          <Text style={[styles.statText, { color: isLiked ? colors.error : colors.textSecondary }]}>
            {review.likeCount ?? 0}
          </Text>
        </Pressable>
        <Pressable style={styles.statItem} onPress={openReview} hitSlop={8} accessibilityRole="button">
          <Ionicons name="chatbubble-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{review.commentCount ?? 0}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function ListCard({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const list = activity.listData!;
  const previews = list.previewImages.filter(Boolean).slice(0, 4) as string[];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => {
        haptics.impactLight();
        router.push(`/lists/${list.listId}`);
      }}
    >
      <CardHeader actor={activity.actor} occurredAt={activity.occurredAt} />
      <View style={styles.listBody}>
        <Text style={[styles.action, { color: colors.textSecondary }]}>{messages.home.listCreated}</Text>
        <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={[styles.listCount, { color: colors.textSecondary }]}>
          {list.gameCount} {messages.home.gamesSuffix}
        </Text>
        {previews.length > 0 ? (
          <View style={styles.previewRow}>
            {previews.map((img, i) => (
              <Image key={i} source={{ uri: getImageUrl(img)! }} style={styles.previewImg} resizeMode="cover" />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function FollowCard({ activity }: { activity: Activity }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const target = activity.followData!;
  const targetName = displayName(target);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => {
        haptics.impactLight();
        router.push(`/profiles/${target.username}`);
      }}
    >
      <CardHeader actor={activity.actor} occurredAt={activity.occurredAt} />
      <View style={styles.followBody}>
        <Text style={[styles.action, { color: colors.textSecondary }]}>{messages.home.startedFollowing}</Text>
        <View style={styles.followTarget}>
          <Avatar uri={target.profileImageUrl} name={target.username} size={34} />
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {targetName}
            </Text>
            <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
              @{target.username}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function FeedCardBase({ activity }: FeedCardProps) {
  switch (activity.type) {
    case ActivityType.Review:
      return activity.reviewData ? <ReviewCard activity={activity} /> : null;
    case ActivityType.ListCreated:
      return activity.listData ? <ListCard activity={activity} /> : null;
    case ActivityType.FollowUser:
      return activity.followData ? <FollowCard activity={activity} /> : null;
    default:
      return null;
  }
}

export const FeedCard = memo(FeedCardBase);

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  handle: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  time: {
    fontSize: FontSize.sm,
  },
  reviewBody: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  gameThumbWrap: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  gameThumb: {
    width: 52,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  reviewContent: {
    flex: 1,
    minWidth: 0,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  ratingText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  snippet: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    marginTop: 5,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.sm,
    paddingLeft: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: FontSize.sm,
  },
  listBody: {
    marginTop: Spacing.sm,
  },
  action: {
    fontSize: FontSize.sm,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: 2,
  },
  listCount: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: Spacing.sm,
  },
  previewImg: {
    width: 38,
    height: 50,
    borderRadius: BorderRadius.sm,
  },
  followBody: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  followTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
