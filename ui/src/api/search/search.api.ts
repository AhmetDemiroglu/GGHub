import { axiosInstance } from "@core/lib/axios";
import type { SearchResult } from "@/models/search/search.model";

export const searchAll = (query: string): Promise<SearchResult[]> => {
    return axiosInstance.get<SearchResult[]>(`/search?query=${encodeURIComponent(query)}`).then((response) => response.data);
};
