import { useEffect } from 'react';
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/src/models/api';
import type { Post } from '@/src/models/post';
import type { Review } from '@/src/models/review';
import {
  applyPostUpdate,
  applyPostUpdateToList,
  onPostUpdate,
  type PostUpdateEvent,
} from '@/src/utils/post-update-bus';
import { onReviewVote } from '@/src/utils/review-vote-bus';
import { onReviewCommentCount } from '@/src/utils/review-comment-bus';

/**
 * Olay yollarini react-query cache'lerine baglar. Kok layout'ta BIR KEZ cagrilir.
 *
 * Neden gerekli: react-query'nin "focus" kavrami uygulamanin one gelmesine
 * bagli (AppState), ekran odagina degil. Stack'te geri donmek ya da sekme
 * degistirmek hicbir sorguyu tazelemez; alttaki ekran 5 dk staleTime boyunca
 * eski sayaci gosterir. Olayi yapan ekran yalnizca KENDI anahtarini
 * gecersizlestiriyordu, ayni varligi gosteren diger ekranlar habersizdi.
 *
 * Yazimlar yerinde (setQueriesData): refetch yok, bekleme yok, kaydirma konumu
 * korunur. Yalnizca sekli farkli olan AI Kulubu akisi gecersizlestirilir.
 */
export function useCacheSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const offPost = onPostUpdate((event) => syncPost(queryClient, event));

    const offVote = onReviewVote((event) => {
      // Olayi yayinlayan ekran kendi kopyasini zaten guncelledi; setReviewVote
      // hedef oy ayni ise dokunmaz, yani o kopyaya iki kez uygulanmaz.
      const update = (review: Review) =>
        review.id === event.reviewId ? setReviewVote(review, event.myVote) : review;
      patchReviews(queryClient, update);
    });

    const offComment = onReviewCommentCount((event) => {
      const update = (review: Review) =>
        review.id === event.reviewId
          ? { ...review, commentCount: Math.max(0, (review.commentCount ?? 0) + event.delta) }
          : review;
      patchReviews(queryClient, update);
    });

    return () => {
      offPost();
      offVote();
      offComment();
    };
  }, [queryClient]);
}

function syncPost(queryClient: QueryClient, event: PostUpdateEvent) {
  // Gonderi detayi. Silinen gonderinin detayi zaten geri gidiyor; kaydi bosaltmak
  // o ekrani kapanirken "bulunamadi"ya dusururdu, bu yuzden eski hali kalir.
  queryClient.setQueriesData<Post>({ queryKey: ['post'] }, (old) =>
    old ? (applyPostUpdate(old, event) ?? old) : old,
  );

  // Detaydaki yanit listesi.
  queryClient.setQueriesData<InfiniteData<PaginatedResponse<Post>>>(
    { queryKey: ['post-replies'] },
    (old) => {
      if (!old) return old;
      let changed = false;
      const pages = old.pages.map((page) => {
        const items = applyPostUpdateToList(page.items, event);
        if (items === page.items) return page;
        changed = true;
        const removed = page.items.length - items.length;
        return { ...page, items, totalCount: Math.max(0, page.totalCount - removed) };
      });
      return changed ? { ...old, pages } : old;
    },
  );

  // Profildeki gonderi sekmesi.
  queryClient.setQueriesData<Post[]>({ queryKey: ['userPosts'] }, (old) =>
    old ? applyPostUpdateToList(old, event) : old,
  );

  // AI Kulubu konusmalari gonderiyi farkli bir sekilde tasiyor; tazelemek yeterli.
  void queryClient.invalidateQueries({ queryKey: ['aiClubConversations'] });
}

/** Inceleme tasiyan tum cache'lere ayni guncellemeyi uygular. */
function patchReviews(queryClient: QueryClient, update: (review: Review) => Review) {
  queryClient.setQueriesData<Review>({ queryKey: ['review'] }, (old) =>
    old ? update(old) : old,
  );
  for (const key of ['gameReviews', 'userReviews']) {
    queryClient.setQueriesData<Review[]>({ queryKey: [key] }, (old) => {
      if (!old) return old;
      let changed = false;
      const next = old.map((review) => {
        const updated = update(review);
        if (updated !== review) changed = true;
        return updated;
      });
      return changed ? next : old;
    });
  }
}

/**
 * Kullanicinin oyunu HEDEF degere getirir. Delta degil hedef kullanilir: ayni
 * olay birden cok kopyaya (ya da ayni kopyaya iki kez) ulassa da sonuc tutarli
 * kalir. Sunucu oyu toggle ettigi icin bayat "oy yok" gorunumu, bir sonraki
 * dokunusta oyu yanlislikla GERI ALDIRIYORDU.
 */
function setReviewVote(review: Review, myVote: number | null): Review {
  const previous = review.currentUserVote ?? null;
  if (previous === myVote) return review;
  const before = previous ?? 0;
  const after = myVote ?? 0;
  return {
    ...review,
    currentUserVote: myVote,
    voteScore: review.voteScore - before + after,
    likeCount: Math.max(0, (review.likeCount ?? 0) + (after === 1 ? 1 : 0) - (before === 1 ? 1 : 0)),
  };
}
