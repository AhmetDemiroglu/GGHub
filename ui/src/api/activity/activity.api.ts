import { axiosInstance } from "@core/lib/axios";
import { Activity } from "@/models/activity/activity.model";

export const getUserActivityFeed = async (username: string): Promise<Activity[]> => {
    const response = await axiosInstance.get<Activity[]>(`/activities/user/${username}`);
    return response.data;
};
