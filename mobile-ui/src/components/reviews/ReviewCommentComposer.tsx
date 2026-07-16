import React, { useCallback } from 'react';
import { DockedCommentComposer } from '@/src/components/comments/DockedCommentComposer';
import { createReviewComment } from '@/src/api/review-comment';

interface ReviewCommentComposerProps {
  reviewId: number;
  onPosted?: () => void;
}

/** lists/ListCommentComposer'in inceleme yorumlari icin aynasi. */
export function ReviewCommentComposer({ reviewId, onPosted }: ReviewCommentComposerProps) {
  const create = useCallback(
    (content: string) => createReviewComment(reviewId, { content }),
    [reviewId],
  );

  return (
    <DockedCommentComposer
      create={create}
      queryKey={['reviewComments', reviewId]}
      onPosted={onPosted}
    />
  );
}
