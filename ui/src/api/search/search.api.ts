import { axiosInstance } from "@core/lib/axios";

export interface SearchResult {
    id: string;
    type: string;
    title: string;
    link: string;
    subtitle?: string;
    imageUrl?: string;
}

export const searchAll = (query: string): Promise<SearchResult[]> => {
    return axiosInstance.get<SearchResult[]>(`/search?query=${encodeURIComponent(query)}`).then((response) => response.data);
};
