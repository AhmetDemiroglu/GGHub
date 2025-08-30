import {axiosInstance} from '@core/lib/axios';
import { Profile, ProfileForUpdate } from '@/models/profile/profile.model';

export const getMyProfile = async (): Promise<Profile> => {
  const response = await axiosInstance.get<Profile>('/api/profile/me');
  return response.data;
};
export const updateMyProfile = async (data: ProfileForUpdate): Promise<Profile> => {
  const response = await axiosInstance.put<Profile>('/api/profile/me', data);
  return response.data;
};