import React, { useMemo } from 'react';
import { CommentThreadItem } from '@/src/components/comments/CommentThreadItem';
import { useCommentMutations } from '@/src/components/comments/use-comment-mutations';
import type { CommentApi } from '@/src/components/comments/use-comment-mutations';
import {
  voteOnReviewComment,
  updateReviewComment,
  deleteReviewComment,
  createReviewComment,
} from '@/src/api/review-comment';
import type { ReviewComment } from '@/src/models/review-comment';

interface ReviewCommentItemProps {
  comment: ReviewComment;
  reviewId: number;
}

/**
 * Bir kok inceleme yorumu ve tum yanit agaci. lists/CommentItem'in aynasi:
 * gorunum paylasilan CommentThreadItem'dan, mutasyonlar useCommentMutations'tan
 * gelir; burada yalnizca inceleme yorumu API'si baglanir.
 */
export function ReviewCommentItem({ comment, reviewId }: ReviewCommentItemProps) {
  const api = useMemo<CommentApi<ReviewComment>>(
    () => ({
      vote: (commentId, value) => voteOnReviewComment(commentId, { value }),
      update: (commentId, content) => updateReviewComment(commentId, { content }),
      remove: (commentId) => deleteReviewComment(commentId),
      reply: (parentCommentId, content) =>
        createReviewComment(reviewId, { content, parentCommentId }),
    }),
    [reviewId],
  );

  const handlers = useCommentMutations<ReviewComment>(['reviewComments', reviewId], api);

  return <CommentThreadItem comment={comment} {...handlers} />;
}
