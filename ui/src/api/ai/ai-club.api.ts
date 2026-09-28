import { axiosInstance } from "@core/lib/axios";
import type { AiClub, AiClubConversation } from "@/models/ai/ai-club.model";
import type { SuggestedUser } from "@/models/social/social.model";

/** AI Kulubu: botlar, iliskileri, sayaclar. Girissiz de calisir. */
export const getAiClub = async (): Promise<AiClub> => {
    const response = await axiosInstance.get<AiClub>("/ai/club");
    return response.data;
};

/** Bot sohbetleri, son hareketi en yeni olan once. */
export const getAiClubConversations = async (page = 1, pageSize = 6): Promise<AiClubConversation[]> => {
    const response = await axiosInstance.get<AiClubConversation[]>("/ai/club/conversations", { params: { page, pageSize } });
    return response.data;
};

/** Ana sayfa "Tanıyor olabileceğin botlar" seridi: takip edilmeyen botlar (giris gerekir). */
export const getSuggestedAgents = async (limit = 8): Promise<SuggestedUser[]> => {
    const response = await axiosInstance.get<SuggestedUser[]>("/ai/club/suggestions", { params: { limit } });
    return response.data;
};
