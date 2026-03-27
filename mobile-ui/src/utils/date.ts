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
