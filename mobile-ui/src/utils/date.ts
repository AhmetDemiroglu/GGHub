/**
 * TAKVIM tarihlerini (dogum gunu gibi, saat bileseni olmayan) bicimlendirmenin TEK dogru yolu.
 *
 * NEDEN boyle: Hermes'in iOS'taki Intl'i, yerel saatle kurulmus bir Date'i GMT'ye gore
 * bicimlendirebiliyor. `new Date(2000, 6, 1)` Istanbul'da 1 Temmuz 00:00 ama GMT'de
 * 30 Haziran 21:00'dir; bicimlendirici "Haziran" yazar. Bu, ay etiketlerinin bir kaymasina
 * ve kullanicinin Temmuz secip Agustos kaydetmesine yol acti (2 Agu 2026).
 *
 * Cozum: tarihi Date.UTC ile kur VE bicimlendirirken timeZone'u UTC'ye sabitle. Boylece
 * cihazin saat dilimi ne olursa olsun sonuc ayni.
 */
const CALENDAR_TZ = 'UTC';

const resolveLocale = (locale: string) => (locale.startsWith('tr') ? 'tr-TR' : 'en-US');

/** (2026, 7, 18) -> "18 Temmuz 2026" */
export const formatCalendarDate = (
  year: number,
  month: number,
  day: number,
  locale: string = 'en-US',
): string =>
  new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(resolveLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: CALENDAR_TZ,
  });

/** (7, 18) -> "18 Temmuz". Yil hic tasinmaz. */
export const formatCalendarMonthDay = (
  month: number,
  day: number,
  locale: string = 'en-US',
): string =>
  // Yil yalnizca bicimlendirme icin; artik yil secildi ki 29 Subat da calissin.
  new Date(Date.UTC(2000, month - 1, day)).toLocaleDateString(resolveLocale(locale), {
    day: 'numeric',
    month: 'long',
    timeZone: CALENDAR_TZ,
  });

/** 1..12 -> ["Ocak", ...]. Ay secicisinin etiketleri buradan gelir. */
export const calendarMonthName = (month: number, locale: string = 'en-US'): string =>
  new Date(Date.UTC(2000, month - 1, 1)).toLocaleDateString(resolveLocale(locale), {
    month: 'long',
    timeZone: CALENDAR_TZ,
  });

/** Verilen ay/yil kac gun cekiyor. Artik yil dahil dogru, saat diliminden bagimsiz. */
export const daysInCalendarMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

// Dile gore sayisal tarih: tr -> GG/AA/YYYY, diger -> AA/GG/YYYY. Iki haneli, slash.
export const formatNumericDate = (
  dateString: string | null | undefined,
  locale: string = 'en-US',
): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return locale.startsWith('tr')
      ? `${day}/${month}/${year}`
      : `${month}/${day}/${year}`;
  } catch {
    return '';
  }
};

export const formatDate = (
  dateString: string | null | undefined,
  locale: string = 'en-US',
): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (
  dateString: string | null | undefined,
  locale: string = 'en-US',
): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const formatRelativeTime = (
  dateString: string | null | undefined,
  locale: string = 'en-US',
): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const isTr = locale.startsWith('tr');

    if (diffSeconds < 60) {
      return isTr ? 'az \u00F6nce' : 'just now';
    }
    if (diffMinutes < 60) {
      return isTr
        ? `${diffMinutes} dakika \u00F6nce`
        : `${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
      return isTr
        ? `${diffHours} saat \u00F6nce`
        : `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return isTr
        ? `${diffDays} g\u00FCn \u00F6nce`
        : `${diffDays}d ago`;
    }
    if (diffWeeks < 4) {
      return isTr
        ? `${diffWeeks} hafta \u00F6nce`
        : `${diffWeeks}w ago`;
    }
    if (diffMonths < 12) {
      return isTr
        ? `${diffMonths} ay \u00F6nce`
        : `${diffMonths}mo ago`;
    }
    return isTr
      ? `${diffYears} y\u0131l \u00F6nce`
      : `${diffYears}y ago`;
  } catch {
    return dateString;
  }
};
