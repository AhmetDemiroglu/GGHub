import { axiosInstance } from './client';
import type { SearchResult } from '../models/search';
import type { SocialProfile } from '../models/social';

export const searchAll = (query: string): Promise<SearchResult[]> => {
  return axiosInstance
    .get<SearchResult[]>(`/search?query=${encodeURIComponent(query)}`)
    .then((response) => response.data);
};

export const searchMessageableUsers = (
  query: string,
): Promise<SearchResult[]> => {
  return axiosInstance
    .get<SearchResult[]>(
      `/search/messageable-users?query=${encodeURIComponent(query)}`,
    )
    .then((response) => response.data);
};

/**
 * "@bahis" otomatik tamamlama. Kimlik dogrulama ZORUNLU (backend gizlilik/engel
 * kapisini "current user" olmadan uygulayamaz), en az 1 karakter, en cok 8 sonuc.
 * Sonuclar backend'de zaten gizlilik + engel filtresinden gecmistir.
 */
export const searchMentionableUsers = (
  query: string,
): Promise<SocialProfile[]> => {
  return axiosInstance
    .get<SocialProfile[]>(`/search/mentions?q=${encodeURIComponent(query)}`)
    .then((response) => response.data);
};
