import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Avatar } from '@/src/components/common/Avatar';
import { Button } from '@/src/components/common/Button';
import { useToast } from '@/src/components/common/Toast';
import {
  voteOnListComment,
  updateListComment,
  deleteListComment,
} from '@/src/api/list-comment';
import type { UserListComment } from '@/src/models/list';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface CommentItemProps {
  comment: UserListComment;
  listId: number;
}

export function CommentItem({ comment, listId }: CommentItemProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwner = user && Number(user.id) === comment.owner.id;
  const score = comment.upvotes - comment.downvotes;

  const voteMutation = useMutation({
    mutationFn: (value: number) => voteOnListComment(comment.id, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listComments', listId] });
    },
    onError: () => {
      showToast('error', messages.commentsSection.voteError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) => updateListComment(comment.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listComments', listId] });
      setIsEditing(false);
      showToast('success', messages.commentsSection.updated);
    },
    onError: () => {
      showToast('error', messages.commentsSection.updateError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteListComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listComments', listId] });
      showToast('success', messages.commentsSection.deleted);
    },
    onError: () => {
      showToast('error', messages.commentsSection.deleteError);
    },
  });

  const handleVote = (value: number) => {
    if (!user) return;
    const newValue = comment.currentUserVote === value ? 0 : value;
    voteMutation.mutate(newValue);
  };

  const handleDelete = () => {
    Alert.alert(
      messages.commentsSection.deleteConfirmTitle,
      messages.commentsSection.deleteConfirmMessage,
      [
        { text: messages.common.cancel, style: 'cancel' },
        {
          text: messages.common.delete,
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateMutation.mutate(editContent.trim());
  };

  const timeAgo = new Date(comment.createdAt).toLocaleDateString();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <Avatar
          uri={comment.owner.profileImageUrl}
          name={comment.owner.username}
          size={32}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.username, { color: colors.text }]}>
            @{comment.owner.username}
          </Text>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>{timeAgo}</Text>
        </View>
        {isOwner && !isEditing ? (
          <View style={styles.actions}>
            <Pressable onPress={() => setIsEditing(true)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={[
              styles.editInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            placeholderTextColor={colors.placeholder}
          />
          <View style={styles.editActions}>
            <Button
              title={messages.common.cancel}
              variant="ghost"
              size="sm"
              onPress={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
            />
            <Button
              title={messages.common.save}
              size="sm"
              onPress={handleSaveEdit}
              loading={updateMutation.isPending}
            />
          </View>
        </View>
      ) : (
        <Text style={[styles.content, { color: colors.text }]}>{comment.content}</Text>
      )}

      <View style={styles.voteRow}>
        <Pressable onPress={() => handleVote(1)} style={styles.voteButton} hitSlop={4}>
          <Ionicons
            name={
              comment.currentUserVote === 1
                ? 'chevron-up-circle'
                : 'chevron-up-circle-outline'
            }
            size={20}
            color={comment.currentUserVote === 1 ? colors.success : colors.textMuted}
          />
        </Pressable>
        <Text
          style={[
            styles.score,
            {
              color:
                score > 0
                  ? colors.success
                  : score < 0
                    ? colors.error
                    : colors.textMuted,
            },
          ]}
        >
          {score}
        </Text>
        <Pressable onPress={() => handleVote(-1)} style={styles.voteButton} hitSlop={4}>
          <Ionicons
            name={
              comment.currentUserVote === -1
                ? 'chevron-down-circle'
                : 'chevron-down-circle-outline'
            }
            size={20}
            color={comment.currentUserVote === -1 ? colors.error : colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  username: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: FontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  editContainer: {
    marginBottom: Spacing.sm,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  voteButton: {
    padding: 2,
  },
  score: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
});
