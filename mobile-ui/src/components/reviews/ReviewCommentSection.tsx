import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { ReviewCommentItem } from './ReviewCommentItem';
import { CommentComposer } from '@/src/components/comments/CommentComposer';
import { useToast } from '@/src/components/common/Toast';
import { getReviewComments, createReviewComment } from '@/src/api/review-comment';
import { fillErrorTemplate } from '@/src/utils/format';
import { APP_CONFIG } from '@/src/constants/config';
import { Spacing, FontSize } from '@/src/constants/theme';

interface ReviewCommentSectionProps {
  reviewId: number;
}

/** lists/CommentSection'in inceleme yorumlari icin aynasi. */
export function ReviewCommentSection({ reviewId }: ReviewCommentSectionProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [commentText, setCommentText] = useState('');
  const pageSize = APP_CONFIG.paginationDefaults.pageSize;
  const t = messages.commentsSection;

  const { data, isLoading, isError, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['reviewComments', reviewId],
      queryFn: ({ pageParam }) => getReviewComments(reviewId, { page: pageParam, pageSize }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
        return loaded < lastPage.totalCount ? allPages.length + 1 : undefined;
      },
    });

  const createMutation = useMutation({
    mutationFn: (content: string) => createReviewComment(reviewId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewComments', reviewId] });
      setCommentText('');
      showToast('success', t.added);
    },
    onError: () => {
      showToast('error', fillErrorTemplate(t.addError));
    },
  });

  const handleSend = () => {
    if (!commentText.trim() || createMutation.isPending) return;
    createMutation.mutate(commentText.trim());
  };

  const comments = useMemo(() => (data?.pages ?? []).flatMap((page) => page.items), [data]);
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Composer LISTENIN USTUNDE durur. Sunucu kokleri yeniden eskiye siralar
  // (ReviewCommentService: OrderByDescending(CreatedAt)), yani yeni yorum listenin
  // BASINA eklenir. Composer altta olsaydi kullanici yorumunu gonderdikten sonra
  // ekranin gorunmeyen tepesine eklenirdi ve "gitmedi" sanirdi. Web ve X de boyle.
  const composer = isAuthenticated ? (
    <CommentComposer
      value={commentText}
      onChangeText={setCommentText}
      placeholder={t.placeholder}
      onSend={handleSend}
      isSending={createMutation.isPending}
      style={styles.composer}
    />
  ) : (
    <View style={styles.loginRow}>
      <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>{t.loginPrompt}</Text>
      <Pressable
        onPress={() => router.push('/(auth)/login')}
        hitSlop={10}
        accessibilityRole="link"
        accessibilityLabel={t.loginLink}
      >
        <Text style={[styles.loginLink, { color: colors.primary }]}>{t.loginLink}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t.title.replace('{count}', String(totalCount))}
      </Text>

      {composer}

      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : isError ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{t.loadError}</Text>
      ) : comments.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.empty}</Text>
      ) : (
        <>
          {comments.map((comment) => (
            <ReviewCommentItem key={comment.id} comment={comment} reviewId={reviewId} />
          ))}
          {hasNextPage ? (
            <Pressable
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              style={styles.loadMoreButton}
              accessibilityRole="button"
              accessibilityLabel={t.loadMore
                .replace('{shown}', String(comments.length))
                .replace('{total}', String(totalCount))}
            >
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {t.loadMore
                    .replace('{shown}', String(comments.length))
                    .replace('{total}', String(totalCount))}
                </Text>
              )}
            </Pressable>
          ) : null}
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  loader: {
    marginVertical: Spacing.lg,
  },
  errorText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    // Bos durum bilerek KUCUK: eskiden bos bir incelemede yorum bolumu
    // gereksiz yere kocaman bir bosluk aciyordu.
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  loadMoreButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  composer: {
    marginTop: Spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  loginPrompt: {
    fontSize: FontSize.sm,
  },
  loginLink: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
