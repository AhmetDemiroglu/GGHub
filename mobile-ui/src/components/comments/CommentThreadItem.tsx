import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Button } from '@/src/components/common/Button';
import { MentionText } from '@/src/components/common/MentionText';
import { CommentComposer } from '@/src/components/comments/CommentComposer';
import { UserLinkAvatar, UserLinkName, type LinkableUser } from '@/src/components/common/UserLink';
import { useConfirm } from '@/src/components/common/ConfirmDialog';
import { formatTimeAgo } from '@/src/utils/format';
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

/**
 * Bu sayiya kadar yanit ACIK acilir (X/Twitter davranisi: yanitlar gonderinin
 * hemen altinda durur). Uzeri, basligi ezmesin diye katlanmis baslar.
 */
const AUTO_EXPAND_REPLIES = 3;

export interface CommentThreadItemProps {
  comment: ThreadComment;
  /** 0 = kok yorum. Yanit butonu depth < 2 iken gosterilir. */
  depth?: number;
  onVote: (commentId: number, value: number) => void;
  /** Sunucu cevabini bekleyebilmek icin promise dondurur (bkz. handleSaveEdit). */
  onUpdate: (commentId: number, content: string) => Promise<unknown> | void;
  onDelete: (commentId: number) => void;
  /** Sunucu cevabini bekleyebilmek icin promise dondurur (bkz. handleSendReply). */
  onReply: (parentCommentId: number, content: string) => Promise<unknown> | void;
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

  const replies = comment.replies ?? [];

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  // Az sayida yanit dogrudan gorunur; sadece kalabalik basliklar katlanir.
  const [showReplies, setShowReplies] = useState(replies.length <= AUTO_EXPAND_REPLIES);

  const isOwner = !!user && Number(user.id) === comment.owner.id;
  const score = comment.upvotes - comment.downvotes;
  const canReply = !!user && depth < MAX_REPLY_DEPTH;
  const isUpdating = pendingUpdateFor === comment.id;
  const isSubmittingReply = pendingReplyFor === comment.id;
  const timeAgo = formatTimeAgo(comment.createdAt);

  const handleVote = (value: number) => {
    if (!user) return;
    // Oyu geri cekmek icin AYNI degeri tekrar gonder; backend toggle ediyor
    // (UserListCommentService/ReviewCommentService.VoteOnCommentAsync).
    // Eskiden 0 gonderiliyordu, backend ise Value == 0'i acikca reddedip 400 firlatiyor:
    // yani mobilde oy geri cekme her seferinde hata veriyordu.
    onVote(comment.id, value);
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

  // Duzenleyici sunucu cevabina KADAR acik ve dolu kalir: hata olursa kullanici
  // yazdigini kaybetmez ve Kaydet butonunun spinner'i gercekten donebilir.
  const handleSaveEdit = async () => {
    const next = editContent.trim();
    if (!next || isUpdating) return;
    try {
      await onUpdate(comment.id, next);
      setIsEditing(false);
    } catch {
      // Hata bildirimi mutasyon katmaninda gosterildi; form acik birakiliyor.
    }
  };

  // Ayni gerekce: yanit kutusu ancak gonderim BASARILI olunca temizlenip kapanir
  // ve yeni yanit hemen gorunur olsun diye alt agac aciliyor.
  const handleSendReply = async () => {
    const next = replyContent.trim();
    if (!next || isSubmittingReply) return;
    try {
      await onReply(comment.id, next);
      setReplyContent('');
      setIsReplying(false);
      setShowReplies(true);
    } catch {
      // Hata bildirimi mutasyon katmaninda gosterildi; yazilan metin duruyor.
    }
  };

  return (
    <View
      style={[
        styles.container,
        // Kok yorumlar ayrilir; yanitlar zaten sol cizgiyle gruplanmis durumda.
        depth === 0 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        depth > 0 && styles.containerNested,
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
            <Pressable
              onPress={() => setIsEditing(true)}
              style={styles.actionButton}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t.editComment}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              // Yikici eylem, iyi huylu komsusundan bilerek uzak tutulur.
              style={[styles.actionButton, styles.destructiveAction]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t.deleteComment}
            >
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
              disabled={isUpdating}
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
        <Pressable
          onPress={() => handleVote(1)}
          style={styles.voteButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t.upvote}
          accessibilityState={{ selected: comment.currentUserVote === 1 }}
        >
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
        <Pressable
          onPress={() => handleVote(-1)}
          style={styles.voteButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t.downvote}
          accessibilityState={{ selected: comment.currentUserVote === -1 }}
        >
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
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={isReplying ? messages.common.cancel : t.reply}
          >
            <Ionicons name="arrow-undo-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.replyText, { color: colors.textMuted }]}>
              {isReplying ? messages.common.cancel : t.reply}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isReplying ? (
        <CommentComposer
          value={replyContent}
          onChangeText={setReplyContent}
          placeholder={t.replyPlaceholder.replace('{username}', comment.owner.username)}
          onSend={handleSendReply}
          isSending={isSubmittingReply}
          autoFocus
          compact
          style={styles.replyComposer}
        />
      ) : null}

      {replies.length > 0 ? (
        <Pressable
          onPress={() => setShowReplies((prev) => !prev)}
          style={styles.repliesToggle}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityState={{ expanded: showReplies }}
          accessibilityLabel={
            showReplies ? t.hideReplies : t.showReplies.replace('{count}', String(replies.length))
          }
        >
          <Ionicons
            name={showReplies ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.primary}
          />
          <Text style={[styles.repliesToggleText, { color: colors.primary }]}>
            {showReplies ? t.hideReplies : t.showReplies.replace('{count}', String(replies.length))}
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
  containerNested: {
    // Ic ice yanitlar kok yorumdan daha sik nefes alir; aksi halde 3. seviyede
    // dikey bosluk yorumun kendisinden fazla yer kapliyor.
    paddingVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
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
    alignItems: 'center',
  },
  actionButton: {
    // 16px ikon + 8+8 padding + 6 hitSlop = 44x44 dokunma hedefi (HIG/Material).
    padding: Spacing.sm,
  },
  destructiveAction: {
    // hitSlop'lar cakismasin (6+6) ve yanlis dokunus silmeye dusmesin diye.
    marginLeft: Spacing.md,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  editContainer: {
    marginBottom: Spacing.xs,
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
    marginLeft: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  replyText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  replyComposer: {
    marginTop: Spacing.sm,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  repliesToggleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  repliesWrap: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    paddingLeft: Spacing.md,
    borderLeftWidth: 2,
  },
});
