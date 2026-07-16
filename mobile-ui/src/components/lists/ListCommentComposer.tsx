import React, { useCallback } from 'react';
import { DockedCommentComposer } from '@/src/components/comments/DockedCommentComposer';
import { createListComment } from '@/src/api/list-comment';

interface ListCommentComposerProps {
  listId: number;
  onPosted?: () => void;
}

/**
 * Liste detayinin alta sabitlenen kok yorum kutusu. Gorunumun ve mutasyonun
 * tamami DockedCommentComposer'dan gelir; bu dosya yalnizca liste yorumu
 * API'sini baglar (inceleme yorumlarinin aynadaki karsiligi:
 * reviews/ReviewCommentComposer).
 */
export function ListCommentComposer({ listId, onPosted }: ListCommentComposerProps) {
  const create = useCallback(
    (content: string) => createListComment(listId, { content }),
    [listId],
  );

  return (
    <DockedCommentComposer
      create={create}
      queryKey={['listComments', listId]}
      onPosted={onPosted}
    />
  );
}
