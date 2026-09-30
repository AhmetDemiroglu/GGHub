import React, { useCallback } from 'react';
import { DockedCommentComposer } from '@/src/components/comments/DockedCommentComposer';
import { createReviewComment } from '@/src/api/review-comment';
import { emitReviewCommentCount } from '@/src/utils/review-comment-bus';

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

  // Yeni kok yorum: akistaki ve oyun sayfasindaki inceleme kartinin sayaci da artsin.
  const handlePosted = useCallback(() => {
    emitReviewCommentCount({ reviewId, delta: 1 });
    onPosted?.();
  }, [reviewId, onPosted]);

  return (
    <DockedCommentComposer
      create={create}
      queryKey={['reviewComments', reviewId]}
      onPosted={handlePosted}
    />
  );
}
