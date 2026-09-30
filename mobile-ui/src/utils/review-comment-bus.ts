/**
 * Inceleme yorum sayacinin ekranlar arasi senkronu (review-vote-bus'in yorum
 * karsiligi). Inceleme detayinda yazilan yorum ana sayfa akisindaki ve oyun
 * sayfasindaki kartta sayaci degistirmiyordu.
 *
 * Sayac backend'de YALNIZCA kok yorumlari sayar
 * (ReviewService/ActivityService: Comments.Count(c => c.ParentCommentId == null)).
 * Bu yuzden olay sadece kok yorum eklenince (+1) ya da silinince (-1) yayinlanir;
 * yanitlar sayaci degistirmez.
 */
export interface ReviewCommentCountEvent {
  reviewId: number;
  delta: number;
}

type Listener = (event: ReviewCommentCountEvent) => void;

const listeners = new Set<Listener>();

export function emitReviewCommentCount(event: ReviewCommentCountEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function onReviewCommentCount(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
