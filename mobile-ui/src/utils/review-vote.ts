import type { Review } from '@/src/models/review';

/**
 * Bir incelemeye verilen oyun iyimser (client-side) sonucu.
 *
 * Backend toggle semantigi kullanir (ReviewService.VoteOnReviewAsync):
 * ayni deger tekrar gonderilirse oy KALDIRILIR, farkli deger gonderilirse degistirilir.
 * Buradaki matematik o davranisin birebir aynasidir; sunucu yaniti geldiginde
 * invalidate ile gercek degerler zaten uzlasir.
 */
export function applyReviewVote<T extends Pick<Review, 'voteScore' | 'currentUserVote'>>(
  review: T,
  value: number,
): T {
  if (review.currentUserVote === value) {
    // Ayni oya tekrar basildi: oy geri cekilir.
    return { ...review, voteScore: review.voteScore - value, currentUserVote: null };
  }
  // Yeni oy ya da yon degisikligi: eski oyun etkisi cikar, yenisi girer.
  return {
    ...review,
    voteScore: review.voteScore - (review.currentUserVote ?? 0) + value,
    currentUserVote: value,
  };
}
