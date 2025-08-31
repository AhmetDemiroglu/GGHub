import {axiosInstance} from '@core/lib/axios';
import { Profile, ProfileForUpdate, UpdateProfileVisibilityDto } from '@/models/profile/profile.model';

export const getMyProfile = async (): Promise<Profile> => {
  const response = await axiosInstance.get<Profile>('/profile/me');
  return response.data;
};
export const updateMyProfile = async (data: ProfileForUpdate): Promise<Profile> => {
  const response = await axiosInstance.put<Profile>('/profile/me', data);
  return response.data;
};
export const updateProfileVisibility = async (data: UpdateProfileVisibilityDto) => {
  return axiosInstance.put('/profile/me/visibility', data);
};