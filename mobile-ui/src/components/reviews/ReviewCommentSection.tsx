import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { ReviewCommentItem } from './ReviewCommentItem';
import { MentionInput } from '@/src/components/common/MentionInput';
import { useToast } from '@/src/components/common/Toast';
import { getReviewComments, createReviewComment } from '@/src/api/review-comment';
import { fillErrorTemplate } from '@/src/utils/format';
import { APP_CONFIG } from '@/src/constants/config';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

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
    if (!commentText.trim()) return;
    createMutation.mutate(commentText.trim());
  };

  const comments = useMemo(() => (data?.pages ?? []).flatMap((page) => page.items), [data]);
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t.title.replace('{count}', String(totalCount))}
      </Text>

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

      {isAuthenticated ? (
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          ]}
        >
          <MentionInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t.placeholder}
            style={[styles.input, { color: colors.text }]}
            containerStyle={styles.inputInner}
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!commentText.trim() || createMutation.isPending}
            style={styles.sendButton}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={commentText.trim() ? colors.primary : colors.textMuted}
              />
            )}
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>{t.loginPrompt}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
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
    fontSize: FontSize.md,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  loadMoreButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  inputInner: {
    flex: 1,
  },
  input: {
    fontSize: FontSize.md,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    paddingLeft: Spacing.sm,
    paddingBottom: 2,
  },
  loginPrompt: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
