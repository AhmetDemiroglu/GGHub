import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Merkezi haptics yardımcıları.
 * iOS'ta tam destek; Android'de expo-haptics no-op/azaltılmış davranır.
 * Cihazın "Sistem dokunsal geri bildirim" ayarı kapalıysa otomatik susturulur.
 */

const enabled = Platform.OS === 'ios';

/** Hafif seçim geri bildirimi - tab geçişleri, liste item seçimi */
export function selection(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

/** Hafif etki - buton basışı, CTA tıklama */
export function impactLight(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Orta etki - card basışı, drawer snap, önemli geçişler */
export function impactMedium(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Ağır etki - çıkış, silme, tehlikeli eylem */
export function impactHeavy(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}

/** Başarı - takip etme, beğeni, gönderim başarılı */
export function success(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Uyarı - doğrulama hatası, geçersiz işlem */
export function warning(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Hata - giriş başarısız, ağ hatası */
export function error(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
