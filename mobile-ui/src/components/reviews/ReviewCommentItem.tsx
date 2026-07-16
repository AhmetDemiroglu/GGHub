import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { CommentThreadItem } from '@/src/components/comments/CommentThreadItem';
import {
  voteOnReviewComment,
  updateReviewComment,
  deleteReviewComment,
  createReviewComment,
} from '@/src/api/review-comment';
import { fillErrorTemplate } from '@/src/utils/format';
import type { ReviewComment } from '@/src/models/review-comment';

interface ReviewCommentItemProps {
  comment: ReviewComment;
  reviewId: number;
}

/**
 * Bir kok inceleme yorumu ve tum yanit agaci. lists/CommentItem'in aynasi:
 * gorunum paylasilan CommentThreadItem'dan gelir, burada yalnizca inceleme
 * yorumu API'si baglanir.
 */
export function ReviewCommentItem({ comment, reviewId }: ReviewCommentItemProps) {
  const { messages } = useLocale();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const t = messages.commentsSection;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reviewComments', reviewId] });
  };

  const voteMutation = useMutation({
    mutationFn: ({ commentId, value }: { commentId: number; value: number }) =>
      voteOnReviewComment(commentId, { value }),
    onSuccess: invalidate,
    onError: () => showToast('error', fillErrorTemplate(t.voteError)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      updateReviewComment(commentId, { content }),
    onSuccess: () => {
      invalidate();
      showToast('success', t.updated);
    },
    onError: () => showToast('error', fillErrorTemplate(t.updateError)),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteReviewComment(commentId),
    onSuccess: () => {
      invalidate();
      showToast('success', t.deleted);
    },
    onError: () => showToast('error', fillErrorTemplate(t.deleteError)),
  });

  const replyMutation = useMutation({
    mutationFn: ({ parentCommentId, content }: { parentCommentId: number; content: string }) =>
      createReviewComment(reviewId, { content, parentCommentId }),
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
