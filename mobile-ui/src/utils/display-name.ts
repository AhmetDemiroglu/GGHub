/**
 * Bir kullanicinin gosterilecek adi: varsa "Ad Soyad", yoksa kullanici adi.
 * Backend ad/soyadi opsiyonel tuttugu icin ikisi de bos olabilir; bu durumda
 * username her zaman doludur ve guvenli bir geri dusus saglar.
 */
export interface DisplayNameUser {
  username: string;
  firstName?: string | null;
  lastName?: string | null;
}

export function displayName(user: DisplayNameUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username;
}
