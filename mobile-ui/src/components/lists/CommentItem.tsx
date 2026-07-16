import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { CommentThreadItem } from '@/src/components/comments/CommentThreadItem';
import {
  voteOnListComment,
  updateListComment,
  deleteListComment,
  createListComment,
} from '@/src/api/list-comment';
import { fillErrorTemplate } from '@/src/utils/format';
import type { UserListComment } from '@/src/models/list';

interface CommentItemProps {
  comment: UserListComment;
  listId: number;
}

/**
 * Bir kok liste yorumu ve tum yanit agaci. Gorunumun tamami paylasilan
 * CommentThreadItem'dan gelir; bu dosya yalnizca liste yorumu API'sini baglar
 * (inceleme yorumlarinin aynadaki karsiligi: reviews/ReviewCommentItem).
 */
export function CommentItem({ comment, listId }: CommentItemProps) {
  const { messages } = useLocale();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const t = messages.commentsSection;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['listComments', listId] });
  };

  const voteMutation = useMutation({
    mutationFn: ({ commentId, value }: { commentId: number; value: number }) =>
      voteOnListComment(commentId, { value }),
    onSuccess: invalidate,
    onError: () => showToast('error', fillErrorTemplate(t.voteError)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateListComment(commentId, { content }),
    onSuccess: () => {
      invalidate();
      showToast('success', t.updated);
    },
    onError: () => showToast('error', fillErrorTemplate(t.updateError)),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteListComment(commentId),
    onSuccess: () => {
      invalidate();
      showToast('success', t.deleted);
    },
    onError: () => showToast('error', fillErrorTemplate(t.deleteError)),
  });

  const replyMutation = useMutation({
    mutationFn: ({ parentCommentId, content }: { parentCommentId: number; content: string }) =>
      createListComment(listId, { content, parentCommentId }),
    onSuccess: () => {
      invalidate();
      showToast('success', t.added);
    },
    onError: () => showToast('error', fillErrorTemplate(t.addError)),
  });

  return (
    <CommentThreadItem
      comment={comment}
      onVote={(commentId, value) => voteMutation.mutate({ commentId, value })}
      onUpdate={(commentId, content) => updateMutation.mutate({ commentId, content })}
      onDelete={(commentId) => deleteMutation.mutate(commentId)}
      onReply={(parentCommentId, content) => replyMutation.mutate({ parentCommentId, content })}
      pendingReplyFor={
        replyMutation.isPending ? (replyMutation.variables?.parentCommentId ?? null) : null
      }
      pendingUpdateFor={
        updateMutation.isPending ? (updateMutation.variables?.commentId ?? null) : null
      }
    />
  );
}
