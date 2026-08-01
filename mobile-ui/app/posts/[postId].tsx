import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPost, getPostReplies } from '@/src/api/post';
import { EmptyState } from '@/src/components/common/EmptyState';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { PostCard } from '@/src/components/posts/PostCard';
import { PostComposer } from '@/src/components/posts/PostComposer';
import { ScreenHeader } from '@/src/components/shell';
import { APP_CONFIG } from '@/src/constants/config';
import { FontSize, Spacing } from '@/src/constants/theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { useTheme } from '@/src/hooks/use-theme';
import type { Post } from '@/src/models/post';

export default function PostDetailScreen() {
  const { postId: rawPostId } = useLocalSearchParams<{ postId: string }>();
  const postId = Number(rawPostId);
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomInset = useTabBarHeight();

  const postQueryKey = useMemo(() => ['post', postId], [postId]);
  const repliesQueryKey = useMemo(() => ['post-replies', postId], [postId]);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: postQueryKey,
    queryFn: () => getPost(postId),
    enabled: Number.isFinite(postId),
    // Erisim yoksa sunucu 404 donuyor (403 gonderinin varligini sizdirirdi),
    // tekrar denemenin anlami yok.
    retry: false,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: repliesQueryKey,
    queryFn: ({ pageParam }) =>
      getPostReplies(postId, { page: pageParam, pageSize: APP_CONFIG.paginationDefaults.pageSize }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.totalCount ? allPages.length + 1 : undefined;
    },
    enabled: Number.isFinite(postId) && !!post,
  });

  const replies = useMemo<Post[]>(() => (data?.pages ?? []).flatMap((page) => page.items), [data]);

  const invalidateReplies = () => {
    void queryClient.invalidateQueries({ queryKey: repliesQueryKey });
    void queryClient.invalidateQueries({ queryKey: postQueryKey });
  };

  // ScreenHeader kendi `paddingTop: insets.top` degerini uyguluyor; ScreenWrapper
  // varsayilan `safeArea` ile SafeAreaView sarinca ust bosluk IKI kez binip basligi
  // ve geri butonunu asagi itiyordu. Inceleme/profil ekranlarindaki desen bu:
  // ScreenHeader kullanan ekran `noPadding safeArea={false}` verir. Yatay bosluk
  // zaten icerik stillerinde (section, composer) var, kaybolmuyor.
  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.posts.detailTitle} onBack={() => router.back()} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError || !post ? (
        <EmptyState
          icon="alert-circle-outline"
          title={messages.posts.notFoundTitle}
          description={messages.posts.notFoundDescription}
        />
      ) : (
        <FlatList
          data={replies}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: bottomInset + Spacing.xxl }}
          ListHeaderComponent={
            <View>
              <View style={styles.section}>
                <PostCard post={post} variant="detail" onDeleted={() => router.back()} />
              </View>

              {post.canReply ? (
                <PostComposer
                  parentPostId={post.id}
                  placeholder={messages.posts.replyPlaceholder}
                  onCreated={invalidateReplies}
                />
              ) : (
                <Text style={[styles.disabled, { color: colors.textSecondary }]}>
                  {messages.posts.replyDisabled}
                </Text>
              )}

              <Text style={[styles.repliesTitle, { color: colors.text }]}>
                {messages.posts.repliesTitle}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.section}>
              <PostCard post={item} onDeleted={invalidateReplies} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {messages.posts.repliesEmpty}
            </Text>
          }
          onEndReachedThreshold={0.8}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.primary} />
            ) : null
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  disabled: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  repliesTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
  footer: {
    paddingVertical: Spacing.lg,
  },
});
