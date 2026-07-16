import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { CommentItem } from './CommentItem';
import { getListComments } from '@/src/api/list-comment';
import { APP_CONFIG } from '@/src/constants/config';
import { Spacing, FontSize } from '@/src/constants/theme';

interface CommentSectionProps {
  listId: number;
}

/**
 * Yalnizca BASLIK + LISTE. Kok yorum kutusu bu bolumun icinde degil, ekranin
 * altina sabitlenmis halde durur (lists/ListCommentComposer): boylece klavye
 * acildiginda kutu klavyenin tam ustune oturur. Iki bolum de ayni sorgu
 * anahtarini kullanir, kutu gonderimden sonra onu gecersizlestirir.
 */
export function CommentSection({ listId }: CommentSectionProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const pageSize = APP_CONFIG.paginationDefaults.pageSize;
  const t = messages.commentsSection;

  // useInfiniteQuery: "daha fazla yukle" onceki sayfalari BIRIKTIRIR. Eskiden
  // sadece page state'i artiyordu ve her sayfa bir oncekini ekrandan siliyordu.
  const { data, isLoading, isError, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ['listComments', listId],
      queryFn: ({ pageParam }) => getListComments(listId, { page: pageParam, pageSize }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
        return loaded < lastPage.totalCount ? allPages.length + 1 : undefined;
      },
    });

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
            <CommentItem key={comment.id} comment={comment} listId={listId} />
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
    // Bos durum bilerek KUCUK: eskiden bos bir baslikta ekranin ortasinda
    // kocaman bir bosluk kaliyordu.
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
});
