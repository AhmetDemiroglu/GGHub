import { axiosInstance } from './client';
import type {
  Profile,
  ProfileForUpdate,
  UpdateProfileVisibilityDto,
  UpdateMessageSettingDto,
  PublicProfile,
} from '../models/profile';

export const getMyProfile = async (): Promise<Profile> => {
  const response = await axiosInstance.get<Profile>('/profile/me');
  return response.data;
};

export const updateMyProfile = async (
  data: ProfileForUpdate,
): Promise<Profile> => {
  const response = await axiosInstance.put<Profile>('/profile/me', data);
  return response.data;
};

export const updateProfileVisibility = async (
  data: UpdateProfileVisibilityDto,
) => {
  return axiosInstance.put('/profile/me/visibility', data);
};

export const deleteMyAccount = async (): Promise<void> => {
  await axiosInstance.delete('/profile/me');
};

export const updateMessageSetting = async (
  data: UpdateMessageSettingDto,
) => {
  return axiosInstance.put('/profile/me/message-setting', data);
};

export const getProfileByUsername = (
  username: string,
): Promise<PublicProfile> => {
  return axiosInstance
    .get<PublicProfile>(`/profiles/${username}`)
    .then((response) => response.data);
};
