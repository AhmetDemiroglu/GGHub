import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Button } from '@/src/components/common/Button';
import { MentionText } from '@/src/components/common/MentionText';
import { MentionInput } from '@/src/components/common/MentionInput';
import { UserLinkAvatar, UserLinkName, type LinkableUser } from '@/src/components/common/UserLink';
import { useConfirm } from '@/src/components/common/ConfirmDialog';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

/**
 * Liste yorumu (UserListComment) ve inceleme yorumu (ReviewComment) icin ORTAK
 * sekil. Iki DTO da bunu yapisal olarak karsilar; tek fark sahip olduklari
 * listId/reviewId alanidir ve bu bilesenin umrunda degildir.
 */
export interface ThreadCommentOwner extends LinkableUser {
  id: number;
}

export interface ThreadComment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt?: string;
  owner: ThreadCommentOwner;
  parentCommentId?: number;
  upvotes: number;
  downvotes: number;
  currentUserVote: number;
  replies?: ThreadComment[];
}

/** Sunucu tam olarak 3 seviye ic ice yanit doner: 0, 1, 2. */
const MAX_REPLY_DEPTH = 2;

export interface CommentThreadItemProps {
  comment: ThreadComment;
  /** 0 = kok yorum. Yanit butonu depth < 2 iken gosterilir. */
  depth?: number;
  onVote: (commentId: number, value: number) => void;
  onUpdate: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
  onReply: (parentCommentId: number, content: string) => void;
  /** Suan yanit gonderilen kok yorumun id'si (yalnizca o formda spinner doner). */
  pendingReplyFor?: number | null;
  /** Suan guncellenen yorumun id'si. */
  pendingUpdateFor?: number | null;
}

export function CommentThreadItem({
  comment,
  depth = 0,
  onVote,
  onUpdate,
  onDelete,
  onReply,
  pendingReplyFor,
  pendingUpdateFor,
}: CommentThreadItemProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const confirm = useConfirm();
  const t = messages.commentsSection;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(false);

  const isOwner = !!user && Number(user.id) === comment.owner.id;
  const score = comment.upvotes - comment.downvotes;
  const replies = comment.replies ?? [];
  const canReply = !!user && depth < MAX_REPLY_DEPTH;
  const isUpdating = pendingUpdateFor === comment.id;
  const isSubmittingReply = pendingReplyFor === comment.id;
  const timeAgo = new Date(comment.createdAt).toLocaleDateString();

  const handleVote = (value: number) => {
    if (!user) return;
    onVote(comment.id, comment.currentUserVote === value ? 0 : value);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t.deleteConfirmTitle,
      message: t.deleteConfirmMessage,
      confirmLabel: messages.common.delete,
      destructive: true,
    });
    if (ok) onDelete(comment.id);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    onUpdate(comment.id, editContent.trim());
    setIsEditing(false);
  };

  const handleSendReply = () => {
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent.trim());
    setReplyContent('');
    setIsReplying(false);
  };

  return (
    <View
      style={[
        styles.container,
        // Kok yorumlar ayrilir; yanitlar zaten sol cizgiyle gruplanmis durumda.
        depth === 0 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <UserLinkAvatar user={comment.owner} size={depth === 0 ? 32 : 26} />
        <UserLinkName
          user={comment.owner}
          variant="handle"
          containerStyle={styles.headerInfo}
          style={[styles.username, { color: colors.text }]}
        >
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {timeAgo}
            {comment.updatedAt ? ` ${t.edited}` : ''}
          </Text>
        </UserLinkName>
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
              loading={isUpdating}
            />
          </View>
        </View>
      ) : (
        <MentionText body={comment.content} style={[styles.content, { color: colors.text }]} />
      )}

      <View style={styles.voteRow}>
        <Pressable onPress={() => handleVote(1)} style={styles.voteButton} hitSlop={4}>
          <Ionicons
            name={comment.currentUserVote === 1 ? 'chevron-up-circle' : 'chevron-up-circle-outline'}
            size={20}
            color={comment.currentUserVote === 1 ? colors.success : colors.textMuted}
          />
        </Pressable>
        <Text
          style={[
            styles.score,
            { color: score > 0 ? colors.success : score < 0 ? colors.error : colors.textMuted },
          ]}
        >
          {score}
        </Text>
        <Pressable onPress={() => handleVote(-1)} style={styles.voteButton} hitSlop={4}>
          <Ionicons
            name={
              comment.currentUserVote === -1 ? 'chevron-down-circle' : 'chevron-down-circle-outline'
            }
            size={20}
            color={comment.currentUserVote === -1 ? colors.error : colors.textMuted}
          />
        </Pressable>

        {canReply ? (
          <Pressable
            onPress={() => setIsReplying((prev) => !prev)}
            style={styles.replyButton}
            hitSlop={6}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.replyText, { color: colors.textMuted }]}>
              {isReplying ? messages.common.cancel : t.reply}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isReplying ? (
        <View
          style={[
            styles.replyBox,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
          ]}
        >
          <MentionInput
            value={replyContent}
            onChangeText={setReplyContent}
            placeholder={t.replyPlaceholder.replace('{username}', comment.owner.username)}
            style={[styles.replyInput, { color: colors.text }]}
            containerStyle={styles.replyInputContainer}
            maxLength={1000}
          />
          <Pressable
            onPress={handleSendReply}
            disabled={!replyContent.trim() || isSubmittingReply}
            style={styles.sendButton}
            hitSlop={6}
          >
            {isSubmittingReply ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={replyContent.trim() ? colors.primary : colors.textMuted}
              />
            )}
          </Pressable>
        </View>
      ) : null}

      {replies.length > 0 ? (
        <Pressable
          onPress={() => setShowReplies((prev) => !prev)}
          style={styles.repliesToggle}
          hitSlop={6}
        >
          <Ionicons
            name={showReplies ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.repliesToggleText, { color: colors.primary }]}>
            {showReplies
              ? t.hideReplies
              : t.showReplies.replace('{count}', String(replies.length))}
          </Text>
        </Pressable>
      ) : null}

      {showReplies && replies.length > 0 ? (
        <View style={[styles.repliesWrap, { borderLeftColor: colors.border }]}>
          {replies.map((reply) => (
            <CommentThreadItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onVote={onVote}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReply={onReply}
              pendingReplyFor={pendingReplyFor}
              pendingUpdateFor={pendingUpdateFor}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
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
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.sm,
    paddingVertical: 2,
  },
  replyText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  replyInputContainer: {
    flex: 1,
  },
  replyInput: {
    fontSize: FontSize.md,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    paddingLeft: Spacing.sm,
    paddingBottom: 2,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  repliesToggleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  repliesWrap: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
  },
});
