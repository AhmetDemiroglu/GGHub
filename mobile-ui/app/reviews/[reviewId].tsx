import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  type LayoutChangeEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { StarRating } from '@/src/components/common/StarRating';
import { MentionText } from '@/src/components/common/MentionText';
import { UserLinkAvatar, UserLinkName } from '@/src/components/common/UserLink';
import { ReviewCommentSection } from '@/src/components/reviews/ReviewCommentSection';
import { ReviewCommentComposer } from '@/src/components/reviews/ReviewCommentComposer';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useKeyboardDock } from '@/src/hooks/use-keyboard-dock';
import { getReviewById, voteReview } from '@/src/api/review';
import { getImageUrl } from '@/src/utils/image';
import { formatTimeAgo } from '@/src/utils/format';
import { applyReviewVote } from '@/src/utils/review-vote';
import { emitReviewVote, voteTransition } from '@/src/utils/review-vote-bus';
import * as haptics from '@/src/utils/haptics';
import type { Review } from '@/src/models/review';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

/**
 * Bir incelemenin kalici linki. Bildirimler buraya "/reviews/{id}" ile gelir
 * (yorum/yanit/begeni/bahis olaylari).
 *
 * Not: expo-router'da statik segment dinamik segmenti yener; bu yuzden
 * "reviews/user/[username]" ekrani "/reviews/user/x" icin cozulmeye devam eder,
 * bu dosya yalnizca "/reviews/123" gibi tek segmentli yollari yakalar.
 */
export default function ReviewDetailScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const commentsOffsetRef = useRef(0);

  const numericId = Number(reviewId);
  const t = messages.reviewDetail;

  // Bu ekran KOK stack'te: tab bar YOK. Klavye kapaliyken kutu home
  // indicator'un hemen ustunde dinlenir, acilinca klavyenin tam ustune oturur.
  const dockStyle = useKeyboardDock(insets.bottom);

  // Yorum bolumunun kayan icerik icindeki dikey konumu. Gonderim sonrasi
  // oraya kaydirmak icin: sunucu yeni yorumu listenin BASINA koyuyor
  // (ReviewCommentService: OrderByDescending(CreatedAt)) ve kutu altta sabit
  // oldugu icin kullanici yoksa hicbir sey olmamis saniyor.
  const handleCommentsLayout = useCallback((event: LayoutChangeEvent) => {
    commentsOffsetRef.current = event.nativeEvent.layout.y;
  }, []);

  const scrollToComments = useCallback(() => {
    scrollRef.current?.scrollTo({ y: commentsOffsetRef.current, animated: true });
  }, []);

  const {
    data: review,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['review', numericId],
    queryFn: () => getReviewById(numericId),
    enabled: Number.isFinite(numericId),
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Iyimser oy: skor ve ikon aninda degisir, sunucu yaniti onSettled'da uzlasir.
  // ReviewCard'daki desenin tekil-kayit hali (cache'te Review[] degil tek Review var).
  const voteMutation = useMutation({
    mutationFn: (value: number) => voteReview(numericId, { value }),
    onMutate: async (value: number) => {
      await queryClient.cancelQueries({ queryKey: ['review', numericId] });
      const previous = queryClient.getQueryData<Review>(['review', numericId]);
      queryClient.setQueryData<Review>(['review', numericId], (old) =>
        old ? applyReviewVote(old, value) : old,
      );
      // Ana sayfa akışı gibi query dışı yüzeyler de anında senkronlansın.
      if (previous) {
        emitReviewVote({ reviewId: numericId, ...voteTransition(previous.currentUserVote, value) });
      }
      return { previous };
    },
    onError: (_error, value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['review', numericId], context.previous);
        const t = voteTransition(context.previous.currentUserVote, value);
        emitReviewVote({
          reviewId: numericId,
          likeDelta: -t.likeDelta,
          scoreDelta: -t.scoreDelta,
          myVote: context.previous.currentUserVote,
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['review', numericId] });
    },
  });

  const handleVote = (value: number) => {
    // Ucustayken ikinci dokunusu yut (toggle yuzunden "oy ver + geri al" olmasin).
    if (!user || voteMutation.isPending) return;
    haptics.impactLight();
    voteMutation.mutate(value);
  };

  if (isLoading) return <LoadingScreen />;

  if (isError || !review) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={messages.nav.screenTitles.reviewDetail} />
        <EmptyState icon="alert-circle-outline" title={t.notFound} />
      </ScreenWrapper>
    );
  }

  const game = review.game;
  const gameImage = game ? getImageUrl(game.coverImage ?? game.backgroundImage) : undefined;
  const isOwner = user ? Number(user.id) === review.user.id : false;

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.nav.screenTitles.reviewDetail} />
      {/*
        Kayan icerik ve alta sabit yorum kutusu, paddingBottom'u klavyeyle
        birlikte UI thread'de akan TEK bir kabin icinde durur (useKeyboardDock):
        kutu klavyenin tam ustune oturur, icerik alani da o kadar kisalir.

        keyboardShouldPersistTaps olmadan dis ScrollView ilk dokunusu "klavyeyi
        kapat" diye yutuyordu: bahis cipi, gonder, yanitla, oy ve sil ilk
        dokunusta calismiyordu.
      */}
      <Animated.View style={[styles.flex, dockStyle]}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
        <View style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <UserLinkAvatar user={review.user} size={40} />
            <UserLinkName
              user={review.user}
              containerStyle={styles.userInfo}
              style={[styles.username, { color: colors.text }]}
            >
              <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                {formatTimeAgo(review.createdAt)}
              </Text>
            </UserLinkName>
            <StarRating rating={Math.round(review.rating / 2)} maxStars={5} size={16} />
          </View>

          {game ? (
            <Pressable
              style={[styles.gameRow, { borderColor: colors.border }]}
              onPress={() => router.push(`/game/${game.slug}`)}
            >
              <View style={[styles.gameCover, { backgroundColor: colors.surfaceHighlight }]}>
                {gameImage ? (
                  <Image source={{ uri: gameImage }} style={styles.gameCoverImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="game-controller-outline" size={20} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.gameInfo}>
                <Text style={[styles.gameName, { color: colors.text }]} numberOfLines={2}>
                  {game.name}
                </Text>
                <Text style={[styles.ratingText, { color: colors.textMuted }]}>
                  {t.ratingValue.replace('{rating}', String(review.rating))}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {review.content ? (
            <MentionText
              body={review.content}
              style={[styles.reviewText, { color: colors.textSecondary }]}
            />
          ) : null}

          {/* Kendi incelemene oy verilemez (backend 400 doner); sahibine skor
              salt-okunur gosterilir, digerlerine iki yonlu oy butonlari. */}
          <View style={styles.voteRow}>
            {isOwner ? (
              <Ionicons name="thumbs-up-outline" size={14} color={colors.textMuted} />
            ) : (
              <Pressable
                style={[styles.voteButton, review.currentUserVote === 1 && { backgroundColor: `${colors.success}20` }]}
                onPress={() => handleVote(1)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={messages.commentsSection.upvote}
              >
                <Ionicons
                  name={review.currentUserVote === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={16}
                  color={review.currentUserVote === 1 ? colors.success : colors.textMuted}
                />
              </Pressable>
            )}
            <Text
              style={[
                styles.voteScore,
                {
                  color:
                    review.voteScore > 0
                      ? colors.success
                      : review.voteScore < 0
                        ? colors.error
                        : colors.textMuted,
                },
              ]}
            >
              {review.voteScore}
            </Text>
            {!isOwner ? (
              <Pressable
                style={[styles.voteButton, review.currentUserVote === -1 && { backgroundColor: `${colors.error}20` }]}
                onPress={() => handleVote(-1)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={messages.commentsSection.downvote}
              >
                <Ionicons
                  name={review.currentUserVote === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={16}
                  color={review.currentUserVote === -1 ? colors.error : colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View onLayout={handleCommentsLayout}>
          <ReviewCommentSection reviewId={numericId} />
        </View>
        </ScrollView>

        <ReviewCommentComposer reviewId={numericId} onPosted={scrollToComments} />
      </Animated.View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    // Yorum kutusu kayan icerigin UZERINE binmez, ALTINDA kardes olarak durur;
    // burada sadece son yorumun kutunun ust cizgisine yapismamasi icin nefes
    // payi birakilir. Alt guvenli alan bosluguna kap zaten bakiyor.
    paddingBottom: Spacing.md,
  },
  reviewCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: FontSize.xs,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gameCover: {
    width: 44,
    height: 58,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gameCoverImage: {
    width: 44,
    height: 58,
  },
  gameInfo: {
    flex: 1,
    gap: 2,
  },
  gameName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  ratingText: {
    fontSize: FontSize.xs,
  },
  reviewText: {
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  voteButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  voteScore: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
});
