import { axiosInstance } from "@core/lib/axios";
import type { SearchResult } from "@/models/search/search.model";
import type { SocialProfile } from "@/models/social/social.model";

export const searchAll = (query: string): Promise<SearchResult[]> => {
    return axiosInstance.get<SearchResult[]>(`/search?query=${encodeURIComponent(query)}`).then((response) => response.data);
};
export const searchMessageableUsers = (query: string): Promise<SearchResult[]> => {
    return axiosInstance.get<SearchResult[]>(`/search/messageable-users?query=${encodeURIComponent(query)}`).then((response) => response.data);
};
/**
 * "@" yazarken cikan mention onerileri. Auth ister, min 1 karakter, en fazla 8 sonuc.
 * Gizlilik ve engel filtreleri backend'de uygulanir.
 */
export const searchMentions = (query: string): Promise<SocialProfile[]> => {
    return axiosInstance.get<SocialProfile[]>(`/search/mentions?q=${encodeURIComponent(query)}`).then((response) => response.data);
};
