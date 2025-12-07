import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import type { UserList, UserListForCreation, UserListForUpdate, UserListDetail, UserListPublic, ListQueryParameters } from "@/models/list/list.model";

export const getMyLists = (gameId?: number): Promise<UserList[]> => {
    const url = gameId ? `/user-lists?gameId=${gameId}` : "/user-lists";
    return axiosInstance.get<UserList[]>(url).then((response) => response.data);
};

export const createList = (data: UserListForCreation): Promise<UserList> => {
    return axiosInstance.post<UserList>("/user-lists", data).then((response) => response.data);
};

export const updateList = (listId: number, data: UserListForUpdate): Promise<void> => {
    return axiosInstance.put(`/user-lists/${listId}`, data).then((response) => response.data);
};

export const deleteList = (listId: number): Promise<void> => {
    return axiosInstance.delete(`/user-lists/${listId}`).then((response) => response.data);
};

export const getMyListDetail = (listId: number): Promise<UserListDetail> => {
    return axiosInstance.get<UserListDetail>(`/user-lists/${listId}/my-detail`).then((response) => response.data);
};

export const getMyWishlist = (): Promise<UserListDetail | null> => {
    return axiosInstance.get<UserListDetail | null>("/user-lists/wishlist").then((response) => response.data);
};

export const getPublicLists = (params: ListQueryParameters): Promise<PaginatedResponse<UserListPublic>> => {
    return axiosInstance.get<PaginatedResponse<UserListPublic>>("/user-lists/public", { params }).then((response) => response.data);
};

export const getListDetail = (listId: number): Promise<UserListDetail> => {
    return axiosInstance.get<UserListDetail>(`/user-lists/${listId}`).then((response) => response.data);
};

export const followList = (listId: number): Promise<void> => {
    return axiosInstance.post(`/user-lists/${listId}/follow`).then((response) => response.data);
};

export const unfollowList = (listId: number): Promise<void> => {
    return axiosInstance.delete(`/user-lists/${listId}/follow`).then((response) => response.data);
};

export const addGameToList = (listId: number, gameId: number): Promise<void> => {
    return axiosInstance.post(`/user-lists/${listId}/games`, { gameId: gameId }).then((response) => response.data);
};

export const removeGameFromList = (listId: number, gameId: number): Promise<void> => {
    return axiosInstance.delete(`/user-lists/${listId}/games/${gameId}`).then((response) => response.data);
};

export const getFollowedListsByMe = (params: ListQueryParameters): Promise<PaginatedResponse<UserListPublic>> => {
    return axiosInstance.get<PaginatedResponse<UserListPublic>>("/user-lists/followed-by-me", { params }).then((response) => response.data);
};

export const toggleWishlist = (gameId: number) => {
    return axiosInstance.post<{ isAdded: boolean; message: string }>(`/user-lists/wishlist/${gameId}`).then((res) => res.data);
};

export const checkWishlistStatus = (gameId: number) => {
    return axiosInstance.get<{ isInWishlist: boolean }>(`/user-lists/wishlist/${gameId}/status`).then((res) => res.data);
};

export const getListsByUsername = async (username: string): Promise<UserList[]> => {
    const response = await axiosInstance.get<UserList[]>(`/user-lists/user/${username}`);
    return response.data;
};
