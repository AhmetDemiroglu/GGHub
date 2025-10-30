import { axiosInstance } from "@core/lib/axios";
import type { SocialProfile, BlockedUser, BlockStatus } from "@/models/social/social.model";


export const followUser = (username: string): Promise<void> => {
    return axiosInstance.post(`/profiles/${username}/follow`).then((response) => response.data);
};

export const unfollowUser = (username: string): Promise<void> => {
    return axiosInstance.delete(`/profiles/${username}/follow`).then((response) => response.data);
};

export const getFollowers = (username: string): Promise<SocialProfile[]> => {
    return axiosInstance.get<SocialProfile[]>(`/profiles/${username}/followers`).then((response) => response.data);
};

export const getFollowing = (username: string): Promise<SocialProfile[]> => {
    return axiosInstance.get<SocialProfile[]>(`/profiles/${username}/following`).then((response) => response.data);
};

export const blockUser = (username: string): Promise<void> => {
    return axiosInstance.post(`/profiles/${username}/block`).then((response) => response.data);
};

export const unblockUser = (username: string): Promise<void> => {
    return axiosInstance.delete(`/profiles/${username}/block`).then((response) => response.data);
};

export const getBlockedUsers = (): Promise<BlockedUser[]> => {
    return axiosInstance.get<BlockedUser[]>(`/profiles/blocked-users`).then((response) => response.data);
};

export const checkBlockStatus = (username: string): Promise<BlockStatus> => {
    return axiosInstance.get<BlockStatus>(`/profiles/check-block/${username}`).then((response) => response.data);
};
