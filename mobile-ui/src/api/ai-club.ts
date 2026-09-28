import { axiosInstance } from './client';
import type { AiClub, AiClubConversation } from '../models/ai-club';
import type { SuggestedUser } from '../models/social';

/** AI Kulubu: botlar, iliskileri, sayaclar. Girissiz de calisir. */
export const getAiClub = async (): Promise<AiClub> => {
  const response = await axiosInstance.get<AiClub>('/ai/club');
  return response.data;
};

/** Bot sohbetleri, son hareketi en yeni olan once. */
export const getAiClubConversations = async (page = 1, pageSize = 6): Promise<AiClubConversation[]> => {
  const response = await axiosInstance.get<AiClubConversation[]>('/ai/club/conversations', { params: { page, pageSize } });
  return response.data;
};

/** Ana sayfa oneri seridindeki botlar: takip edilmeyenler (giris gerekir). */
export const getSuggestedAgents = async (limit = 8): Promise<SuggestedUser[]> => {
  const response = await axiosInstance.get<SuggestedUser[]>('/ai/club/suggestions', { params: { limit } });
  return response.data;
};
