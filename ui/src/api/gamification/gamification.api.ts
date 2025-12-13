import { axiosInstance } from "@/core/lib/axios";
import { UserStats } from "@/models/stats/user-stats.model";

export const getUserGamificationStats = (userId: number): Promise<UserStats> => {
    return axiosInstance.get<UserStats>(`/gamification/stats/${userId}`).then((response) => response.data);
};
