import { axiosInstance } from "@core/lib/axios";
import { Activity } from "@/models/activity/activity.model";

export const getUserActivityFeed = async (username: string): Promise<Activity[]> => {
    const response = await axiosInstance.get<Activity[]>(`/activities/user/${username}`);
    return response.data;
};
export const getPersonalizedFeed = (limit: number = 10): Promise<Activity[]> => {
    return axiosInstance.get<Activity[]>(`/activities/feed?limit=${limit}`).then((response) => response.data);
};
