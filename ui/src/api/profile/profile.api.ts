import {axiosInstance} from '@core/lib/axios';
import { Profile, ProfileForUpdate, UpdateProfileVisibilityDto, UpdateMessageSettingDto} from '@/models/profile/profile.model';
import { AxiosResponse } from 'axios';

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

export const exportMyData = async (): Promise<AxiosResponse<Blob>> => {
  return axiosInstance.get('/profile/me/export-data', {
    responseType: 'blob',
  });
};

export const deleteMyAccount = async (): Promise<void> => {
  await axiosInstance.delete('/profile/me');
};

export const updateMessageSetting = async (data: UpdateMessageSettingDto) => {
  return axiosInstance.put('/profile/me/message-setting', data);
};