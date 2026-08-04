import { Activity, ActivityType } from '@/src/models/activity';
import type { Post } from '@/src/models/post';

/**
 * Yeni gonderinin ana sayfa akisina ANINDA dusmesi icin minik olay yolu.
 *
 * Sorunun koku: ana sayfa akisi react-query DEGIL yerel state tutuyor
 * (TabbedActivityFeed) ve gonderi olusturma ayri bir ekranda (/posts/new)
 * yasiyor. Composer basariyla dondugunde akisi haberdar eden hicbir sey yoktu;
 * kullanici geri donunce kendi gonderisini goremiyor, sayfayi elle yenilemek
 * zorunda kaliyordu. Ayni desen inceleme oylari icin de kullaniliyor
 * (bkz. review-vote-bus).
 *
 * Sunucuyu yeniden cagirmak yerine donen gonderi ISTEMCIDE akisin basina
 * ekleniyor: bekleme olmaz ve yuklenmis sayfalar ile kaydirma konumu korunur.
 * Sonraki gercek yenilemede ayni kart sunucudan gelir ve activityKey
 * tekillestirmesi kopyayi zaten eler.
 */
type Listener = (post: Post) => void;

const listeners = new Set<Listener>();

export function emitPostCreated(post: Post): void {
  listeners.forEach((listener) => listener(post));
}

export function onPostCreated(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Gonderiyi akis kartina cevirir. Alanlar backend'in ActivityDto uretimiyle
 * birebir ayni (bkz. ActivityService.BuildPostCandidatesAsync): boylece
 * istemcide olusan kart ile sunucudan gelen kart ayni activityKey'i uretir.
 */
export function postToActivity(post: Post): Activity {
  return {
    id: post.id,
    type: post.repostOf ? ActivityType.Repost : ActivityType.Post,
    occurredAt: post.createdAt,
    actor: post.author,
    postData: post,
  };
}
