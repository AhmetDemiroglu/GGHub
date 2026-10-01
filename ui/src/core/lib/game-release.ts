/**
 * "Oyun cikti mi?" Backend'deki GameRelease.IsUnreleased ile ayni kural: tarih gelecekteyse
 * cikmamistir, tarih yoksa cikmis sayilir (katalogda tarihsiz eski oyunlar var).
 * Cikmamis oyuna inceleme ve puan verilemez; backend de reddeder.
 */
export function isUnreleased(released: string | null | undefined): boolean {
    if (!released || released.length < 10) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return released.slice(0, 10) > today;
}
