import { axiosInstance } from "@core/lib/axios";
import { UserStats } from "@/models/stats/user-stats.model";

export const getUserStats = async (username: string): Promise<UserStats> => {
    const response = await axiosInstance.get<UserStats>(`/stats/user/${username}`);
    return response.data;
};
