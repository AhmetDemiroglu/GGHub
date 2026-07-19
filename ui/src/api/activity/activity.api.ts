import { axiosInstance } from "@core/lib/axios";
import { Activity, ActivityType } from "@/models/activity/activity.model";

export const getUserActivityFeed = async (username: string): Promise<Activity[]> => {
    const response = await axiosInstance.get<Activity[]>(`/activities/user/${username}`);
    return response.data;
};
/**
 * type verilirse filtreleme SUNUCUDA yapilir ve sayfa komple o turden gelir.
 * Verilmezse karisik akis doner. Sekme basina bunu gecmek sart: aksi halde 10
 * kayitlik karisik sayfayi istemcide filtrelemek gerekir ve "Incelemeler"
 * sekmesi, o sayfaya kac inceleme dustuyse yalnizca onu gosterir (mobil bunu
 * bastan beri type ile yapiyor, web'de eksikti).
 */
export const getPersonalizedFeed = (limit: number = 10, cursor?: string, type?: ActivityType): Promise<Activity[]> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    if (type !== undefined) params.set("type", String(type));
    return axiosInstance.get<Activity[]>(`/activities/feed?${params.toString()}`).then((response) => response.data);
};
