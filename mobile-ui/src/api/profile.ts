import { axiosInstance } from './client';
import type {
  Birthday,
  Profile,
  ProfileForUpdate,
  UpdateProfileVisibilityDto,
  UpdateMessageSettingDto,
  PublicProfile,
} from '../models/profile';
import type { PostReplyPermissionSetting, PostVisibilitySetting } from '../models/post';

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

/**
 * Kutlama sayfasinin verisi. Kullanici kimligi GONDERILMEZ, sunucu token'dan cozer.
 * Dogum tarihi kayitli degilse 404 doner (ekran bos duruma duser).
 */
export const getMyBirthday = async (): Promise<Birthday> => {
  const response = await axiosInstance.get<Birthday>('/profile/me/birthday');
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

// Gonderi gizliligi CANLI: bu ucun donusu sonrasi gecmis gonderiler de yeni
// ayara gore suzulur, gonderide saklanan bir kopya yok.
export const updatePostVisibility = async (data: {
  newVisibility: PostVisibilitySetting;
}): Promise<void> => {
  await axiosInstance.put('/profile/me/post-visibility', data);
};

export const updatePostReplyPermission = async (data: {
  newPermission: PostReplyPermissionSetting;
}): Promise<void> => {
  await axiosInstance.put('/profile/me/post-reply-permission', data);
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
