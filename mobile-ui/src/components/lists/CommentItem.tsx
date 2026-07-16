import React, { useMemo } from 'react';
import { CommentThreadItem } from '@/src/components/comments/CommentThreadItem';
import { useCommentMutations } from '@/src/components/comments/use-comment-mutations';
import type { CommentApi } from '@/src/components/comments/use-comment-mutations';
import {
  voteOnListComment,
  updateListComment,
  deleteListComment,
  createListComment,
} from '@/src/api/list-comment';
import type { UserListComment } from '@/src/models/list';

interface CommentItemProps {
  comment: UserListComment;
  listId: number;
}

/**
 * Bir kok liste yorumu ve tum yanit agaci. Gorunumun tamami paylasilan
 * CommentThreadItem'dan, mutasyonlarin tamami useCommentMutations'tan gelir;
 * bu dosya yalnizca liste yorumu API'sini baglar (inceleme yorumlarinin
 * aynadaki karsiligi: reviews/ReviewCommentItem).
 */
export function CommentItem({ comment, listId }: CommentItemProps) {
  const api = useMemo<CommentApi<UserListComment>>(
    () => ({
      vote: (commentId, value) => voteOnListComment(commentId, { value }),
      update: (commentId, content) => updateListComment(commentId, { content }),
      remove: (commentId) => deleteListComment(commentId),
      reply: (parentCommentId, content) =>
        createListComment(listId, { content, parentCommentId }),
    }),
    [listId],
  );

  const handlers = useCommentMutations<UserListComment>(['listComments', listId], api);

  return <CommentThreadItem comment={comment} {...handlers} />;
}
