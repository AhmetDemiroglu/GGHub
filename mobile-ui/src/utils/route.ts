/**
 * The backend emits web-format deep links (used by search results & notifications).
 * Most prefixes match mobile routes 1:1 (`/profiles/`, `/messages/`, `/lists/`),
 * but the game detail route is `/game/[id]` on mobile vs `/games/[slug]` on web.
 * Normalize backend links to valid mobile routes before navigating.
 */
export function toMobileRoute(link: string): string {
  if (!link) return link;
  return link.replace(/^\/games\//, '/game/');
}
