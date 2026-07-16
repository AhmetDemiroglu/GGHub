import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import { fillErrorTemplate } from '@/src/utils/format';
import {
  applyVote,
  removeCommentFromPages,
  updateCommentInPages,
  type CommentNode,
  type CommentPages,
} from './comment-cache';

/** Yorum agacinin ihtiyac duydugu dort ucu; liste ve inceleme farkli URL'ler kullanir. */
export interface CommentApi<T> {
  vote: (commentId: number, value: number) => Promise<unknown>;
  update: (commentId: number, content: string) => Promise<unknown>;
  remove: (commentId: number) => Promise<unknown>;
  reply: (parentCommentId: number, content: string) => Promise<T>;
}

/**
 * Silinen yorum sunucuda zaten yoksa 404 doner. Bu bir HATA DEGIL: kullanicinin
 * istedigi son durum (yorum yok) gerceklesmis demektir. Eskiden ikinci dokunus
 * burada kirmizi bildirim basiyordu.
 */
function isNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  return (error as { response?: { status?: number } }).response?.status === 404;
}

/**
 * Bir yorum agacinin tum mutasyonlari. Oy ve silme OPTIMISTIK calisir (dokunusla
 * birlikte ekran degisir, hata olursa geri alinir); duzenleme ve yanit sunucu
 * cevabini bekler ama form acik/dolu kalir, boylece hatada kullanicinin yazdigi
 * kaybolmaz.
 */
export function useCommentMutations<T extends CommentNode<T>>(
  queryKey: readonly unknown[],
  api: CommentApi<T>,
) {
  const { messages } = useLocale();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const t = messages.commentsSection;

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey });
    return queryClient.getQueryData<CommentPages<T>>(queryKey);
  };

  const rollback = (previous: CommentPages<T> | undefined) => {
    if (previous) queryClient.setQueryData(queryKey, previous);
  };

  const voteMutation = useMutation({
    mutationFn: ({ commentId, value }: { commentId: number; value: number }) =>
      api.vote(commentId, value),
    onMutate: async ({ commentId, value }) => {
      await queryClient.cancelQueries({ queryKey });

      // Geri alma TEK YORUMA dayanir, tum cache anlik goruntusune DEGIL.
      // Onceden butun snapshot geri yukleniyordu: A'ya oy verirken B'ye de oy
      // verilmisse ve A hata alirsa, rollback B'nin basarili oyunu da siliyordu
      // ve onu geri getirecek hicbir sey yoktu.
      let previousComment: T | undefined;
      queryClient.setQueryData<CommentPages<T>>(queryKey, (old) =>
        updateCommentInPages(old, commentId, (comment) => {
          previousComment = comment;
          return applyVote(comment, value);
        }),
      );
      return { previousComment };
    },
    onError: (_error, { commentId }, context) => {
      const previousComment = context?.previousComment;
      if (previousComment) {
        queryClient.setQueryData<CommentPages<T>>(queryKey, (old) =>
          updateCommentInPages(old, commentId, () => previousComment),
        );
      }
      showToast('error', fillErrorTemplate(t.voteError));
    },
    // Sunucuyla uzlas. Iyimser yazim yeterli DEGIL: baska bir mutation'in
    // tetikledigi refetch (or. bir yorum silmek) oy istekte iken donerse
    // iyimser skoru ezer, ve uzlasma olmadan ekranda kalici olarak yanlis kalir.
    // Web tarafi da oyda invalidate ediyor; iki platform ayni davransin.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) =>
      api.update(commentId, content),
    onMutate: async ({ commentId, content }) => {
      const previous = await snapshot();
      queryClient.setQueryData<CommentPages<T>>(queryKey, (old) =>
        updateCommentInPages(old, commentId, (comment) => ({ ...comment, content }) as T),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      rollback(context?.previous);
      showToast('error', fillErrorTemplate(t.updateError));
    },
    onSuccess: () => showToast('success', t.updated),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => api.remove(commentId),
    onMutate: async (commentId) => {
      const previous = await snapshot();
      queryClient.setQueryData<CommentPages<T>>(queryKey, (old) =>
        removeCommentFromPages(old, commentId),
      );
      return { previous };
    },
    onError: (error, _commentId, context) => {
      if (isNotFound(error)) {
        showToast('success', t.deleted);
        return;
      }
      rollback(context?.previous);
      showToast('error', fillErrorTemplate(t.deleteError));
    },
    onSuccess: () => showToast('success', t.deleted),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const replyMutation = useMutation({
    mutationFn: ({ parentCommentId, content }: { parentCommentId: number; content: string }) =>
      api.reply(parentCommentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      showToast('success', t.added);
    },
    onError: () => showToast('error', fillErrorTemplate(t.addError)),
  });

  return {
    onVote: (commentId: number, value: number) => voteMutation.mutate({ commentId, value }),
    onUpdate: (commentId: number, content: string) =>
      updateMutation.mutateAsync({ commentId, content }),
    onDelete: (commentId: number) => deleteMutation.mutate(commentId),
    onReply: (parentCommentId: number, content: string) =>
      replyMutation.mutateAsync({ parentCommentId, content }),
    pendingReplyFor: replyMutation.isPending
      ? (replyMutation.variables?.parentCommentId ?? null)
      : null,
    pendingUpdateFor: updateMutation.isPending
      ? (updateMutation.variables?.commentId ?? null)
      : null,
  };
}
