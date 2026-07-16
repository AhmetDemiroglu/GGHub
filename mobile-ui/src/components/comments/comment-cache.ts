import type { InfiniteData } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/src/models/api';

/**
 * Optimistik guncellemelerin ihtiyac duydugu minimum yorum sekli. Hem
 * UserListComment hem ReviewComment bunu karsilar.
 */
export interface CommentNode<T> {
  id: number;
  content: string;
  upvotes: number;
  downvotes: number;
  currentUserVote: number;
  replies?: T[];
}

/** useInfiniteQuery'nin cache'te tuttugu sekil. */
export type CommentPages<T> = InfiniteData<PaginatedResponse<T>>;

/** Agacta id'si tutan yorumu `update` ile degistirir; digerlerine dokunmaz. */
function mapTree<T extends CommentNode<T>>(
  items: T[],
  commentId: number,
  update: (comment: T) => T,
): T[] {
  return items.map((item) => {
    if (item.id === commentId) return update(item);
    if (!item.replies || item.replies.length === 0) return item;
    return { ...item, replies: mapTree(item.replies, commentId, update) } as T;
  });
}

/** Agactan id'si tutan yorumu (ve dolayisiyla alt agacini) cikarir. */
function removeFromTree<T extends CommentNode<T>>(items: T[], commentId: number): T[] {
  const next: T[] = [];
  for (const item of items) {
    if (item.id === commentId) continue;
    if (item.replies && item.replies.length > 0) {
      next.push({ ...item, replies: removeFromTree(item.replies, commentId) } as T);
    } else {
      next.push(item);
    }
  }
  return next;
}

export function updateCommentInPages<T extends CommentNode<T>>(
  data: CommentPages<T> | undefined,
  commentId: number,
  update: (comment: T) => T,
): CommentPages<T> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: mapTree(page.items, commentId, update),
    })),
  };
}

export function removeCommentFromPages<T extends CommentNode<T>>(
  data: CommentPages<T> | undefined,
  commentId: number,
): CommentPages<T> | undefined {
  if (!data) return data;
  // totalCount backend'de YALNIZCA kok yorumlari sayar (ParentCommentId == null),
  // bu yuzden basliktaki sayac sadece kok bir yorum silindiginde azaltilir.
  const isRoot = data.pages.some((page) => page.items.some((item) => item.id === commentId));
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      totalCount: isRoot ? Math.max(0, page.totalCount - 1) : page.totalCount,
      items: removeFromTree(page.items, commentId),
    })),
  };
}

/**
 * Oyu istemcide uygular. Sunucu ayni hesabi yapar; upvotes/downvotes/
 * currentUserVote'un uclu iliskisi tamamen turetilebilir oldugu icin oku
 * bekletmeye gerek yok.
 */
export function applyVote<T extends CommentNode<T>>(comment: T, value: number): T {
  let upvotes = comment.upvotes;
  let downvotes = comment.downvotes;

  if (comment.currentUserVote === 1) upvotes -= 1;
  if (comment.currentUserVote === -1) downvotes -= 1;
  if (value === 1) upvotes += 1;
  if (value === -1) downvotes += 1;

  return {
    ...comment,
    upvotes: Math.max(0, upvotes),
    downvotes: Math.max(0, downvotes),
    currentUserVote: value,
  } as T;
}
