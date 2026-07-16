/**
 * İnceleme oylarının ekranlar arası canlı senkronu.
 *
 * Sorunun kökü: ana sayfa akışı react-query değil yerel state tutuyor; inceleme
 * detayında verilen oy akışa yansımıyordu. Kullanıcı "işlemedi" sanıp tekrar
 * basınca backend'in toggle davranışı oyu SİLİYORDU. Bu minik bus, oy değiştiren
 * her yüzeyin (feed kartı, oyun sayfası kartı, inceleme detayı) olayını yayınlar;
 * dinleyen yüzeyler kendi kopyalarını günceller.
 */
export interface ReviewVoteEvent {
  reviewId: number;
  /** Kalp sayacına net etki (yalnızca +1 oylar sayılır): -1 | 0 | +1 */
  likeDelta: number;
  /** VoteScore'a net etki (eski oy çıkar, yeni girer). */
  scoreDelta: number;
  /** Olay sonrası kullanıcının oyu. */
  myVote: number | null;
}

type Listener = (event: ReviewVoteEvent) => void;

const listeners = new Set<Listener>();

export function emitReviewVote(event: ReviewVoteEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function onReviewVote(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Oy geçişinin kalp/score etkilerini tek yerden hesaplar. */
export function voteTransition(previous: number | null, value: number): Omit<ReviewVoteEvent, 'reviewId'> {
  const next = previous === value ? null : value;
  const likeDelta = (next === 1 ? 1 : 0) - (previous === 1 ? 1 : 0);
  const scoreDelta = (next ?? 0) - (previous ?? 0);
  return { likeDelta, scoreDelta, myVote: next };
}
