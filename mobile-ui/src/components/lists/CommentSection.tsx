import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { CommentItem } from './CommentItem';
import { useToast } from '@/src/components/common/Toast';
import { getListComments, createListComment } from '@/src/api/list-comment';
import type { UserListComment } from '@/src/models/list';
import { APP_CONFIG } from '@/src/constants/config';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface CommentSectionProps {
  listId: number;
}

export function CommentSection({ listId }: CommentSectionProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = APP_CONFIG.paginationDefaults.pageSize;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['listComments', listId, page],
    queryFn: () => getListComments(listId, { page, pageSize }),
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => createListComment(listId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listComments', listId] });
      setCommentText('');
      showToast('success', messages.commentsSection.added);
    },
    onError: () => {
      showToast('error', messages.commentsSection.addError);
    },
  });

  const handleSend = () => {
    if (!commentText.trim()) return;
    createMutation.mutate(commentText.trim());
  };

  const comments = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasMore = comments.length < totalCount;

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };

  const renderComment = useCallback(
    ({ item }: { item: UserListComment }) => (
      <CommentItem comment={item} listId={listId} />
    ),
    [listId],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {messages.commentsSection.title.replace('{count}', String(totalCount))}
      </Text>

      {isLoading && page === 1 ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
      ) : isError ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {messages.commentsSection.loadError}
        </Text>
      ) : comments.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {messages.commentsSection.empty}
        </Text>
      ) : (
        <>
          <FlatList
            data={comments}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderComment}
            scrollEnabled={false}
          />
          {hasMore ? (
            <Pressable onPress={handleLoadMore} style={styles.loadMoreButton}>
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                {messages.commentsSection.loadMore}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}

      {isAuthenticated ? (
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.inputBorder,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={messages.commentsSection.placeholder}
            placeholderTextColor={colors.placeholder}
            value={commentText}
            onChangeText={setCommentText}
            multiline
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
        <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
          {messages.commentsSection.loginPrompt}
        </Text>
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
  input: {
    flex: 1,
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
