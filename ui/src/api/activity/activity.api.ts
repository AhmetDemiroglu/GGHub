import { axiosInstance } from "@core/lib/axios";
import { Activity } from "@/models/activity/activity.model";

export const getUserActivityFeed = async (username: string): Promise<Activity[]> => {
    const response = await axiosInstance.get<Activity[]>(`/activities/user/${username}`);
    return response.data;
};
export const getPersonalizedFeed = (limit: number = 10, cursor?: string): Promise<Activity[]> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return axiosInstance.get<Activity[]>(`/activities/feed?${params.toString()}`).then((response) => response.data);
};
