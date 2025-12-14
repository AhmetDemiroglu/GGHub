import { axiosInstance } from "@/core/lib/axios";
import { HomeContent } from "@/models/home/home.model";

export const getHomeContent = (): Promise<HomeContent> => {
    return axiosInstance.get<HomeContent>("/home/content").then((response) => response.data);
};