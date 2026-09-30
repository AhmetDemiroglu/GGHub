import type { Post } from '@/src/models/post';

/**
 * Bir gonderinin sayaclari/durumu degisince TUM kopyalarini guncelleyen olay yolu.
 *
 * Sorunun koku: ana sayfa akisi react-query DEGIL yerel state tutuyor
 * (TabbedActivityFeed) ve gonderi karti (PostCard) begeni/repost icin kendi
 * kopyasini tutuyor. Detayda yanit yazip geri donen kullanici akista "0 yanit"
 * goruyordu; akista verilen begeni de kart yeniden cizilince (sekme degisimi,
 * liste sanallastirmasi) geri aliniyormus gibi gorunuyordu.
 *
 * Degisikligi yapan yuzey (PostComposer, PostCard, PostPollView) olayi
 * sunucu cevabindan SONRA yayinlar; dinleyenler (akis ve use-cache-sync'teki
 * react-query cache'leri) kendi kopyalarini gunceller. review-vote-bus ile ayni
 * desen.
 */
export interface PostUpdateEvent {
  postId: number;
  /** Sunucunun dondurdugu son durum; oldugu gibi yazilir, iki kez uygulanmasi zarar vermez. */
  changes?: Partial<Pick<Post, 'likeCount' | 'isLiked' | 'repostCount' | 'isReposted' | 'poll'>>;
  /** Yanit sayacina net etki: yeni yanit +1, silinen yanit -1. */
  replyDelta?: number;
  /** Gonderi silindi. Repost'lari sunucuda FK cascade ile gittigi icin onlar da kaldirilir. */
  deleted?: boolean;
}

type Listener = (event: PostUpdateEvent) => void;

const listeners = new Set<Listener>();

export function emitPostUpdate(event: PostUpdateEvent): void {
  listeners.forEach((listener) => listener(event));
}

export function onPostUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function patch(post: Post, event: PostUpdateEvent): Post {
  return {
    ...post,
    ...event.changes,
    replyCount: Math.max(0, post.replyCount + (event.replyDelta ?? 0)),
  };
}

/**
 * Olayi tek bir gonderiye uygular. Repost kartinda gorunen icerik kaynak
 * gonderi oldugu icin olay kaynaga da islenir.
 *
 * @returns Degismediyse AYNI nesne (React yeniden cizmesin), silindiyse null.
 */
export function applyPostUpdate(post: Post, event: PostUpdateEvent): Post | null {
  if (post.id === event.postId) {
    return event.deleted ? null : patch(post, event);
  }
  if (post.repostOf?.id === event.postId) {
    return event.deleted ? null : { ...post, repostOf: patch(post.repostOf, event) };
  }
  return post;
}

/** Bir gonderi dizisine uygular; hicbir oge degismediyse ayni diziyi dondurur. */
export function applyPostUpdateToList(posts: Post[], event: PostUpdateEvent): Post[] {
  let changed = false;
  const next: Post[] = [];
  for (const post of posts) {
    const updated = applyPostUpdate(post, event);
    if (updated !== post) changed = true;
    if (updated) next.push(updated);
  }
  return changed ? next : posts;
}
