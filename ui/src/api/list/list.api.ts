import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import type { UserList, UserListForCreation, UserListForUpdate, UserListDetail, UserListPublic, ListQueryParameters } from "@/models/list/list.model";

export const getMyLists = (): Promise<UserList[]> => {
    return axiosInstance.get<UserList[]>("/user-lists").then((response) => response.data);
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

export const getFollowedListsByMe = (
    params: ListQueryParameters
): Promise<PaginatedResponse<UserListPublic>> => {
    return axiosInstance.get<PaginatedResponse<UserListPublic>>("/user-lists/followed-by-me", { params }).then((response) => response.data);
};
