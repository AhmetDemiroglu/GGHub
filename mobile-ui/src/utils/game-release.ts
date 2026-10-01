/**
 * "Oyun cikti mi?" Asil karar sunucuda (GameRelease): tarih yoksa kaynaklarin "yakinda"
 * isaretine de bakar ve detay ucunda `isUnreleased` olarak gelir. Bu fonksiyon o alan
 * gelmediginde (eski yanit) yalniz tarihe bakan yedektir.
 */
export function isGameUnreleased(game: { released: string | null; isUnreleased?: boolean | null } | null | undefined): boolean {
  if (!game) return false;
  return game.isUnreleased ?? isUnreleased(game.released);
}

export function isUnreleased(released: string | null | undefined): boolean {
  if (!released || released.length < 10) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return released.slice(0, 10) > today;
}
