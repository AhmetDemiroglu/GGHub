import { axiosInstance } from "@core/lib/axios";
import {
    Birthday,
    Profile,
    ProfileForUpdate,
    UpdateMessageSettingDto,
    UpdateAiInteractionDto,
    AiConsentDto,
    UpdatePostReplyPermissionDto,
    UpdatePostVisibilityDto,
    UpdateProfileVisibilityDto,
} from "@/models/profile/profile.model";
import { AxiosResponse } from "axios";
import { PublicProfile } from "@/models/profile/profile.model";

export const getMyProfile = async (): Promise<Profile> => {
    const response = await axiosInstance.get<Profile>("/profile/me");
    return response.data;
};
export const updateMyProfile = async (data: ProfileForUpdate): Promise<Profile> => {
    const response = await axiosInstance.put<Profile>("/profile/me", data);
    return response.data;
};
/**
 * Kutlama sayfasinin verisi. Kullanici kimligi GONDERILMEZ, sunucu token'dan cozer.
 * Dogum tarihi kayitli degilse 404 doner (sayfa bos duruma duser).
 */
export const getMyBirthday = async (): Promise<Birthday> => {
    const response = await axiosInstance.get<Birthday>("/profile/me/birthday");
    return response.data;
};

export const updateProfileVisibility = async (data: UpdateProfileVisibilityDto) => {
    return axiosInstance.put("/profile/me/visibility", data);
};

export const exportMyData = async (): Promise<AxiosResponse<Blob>> => {
    return axiosInstance.get("/profile/me/export-data", {
        responseType: "blob",
    });
};

export const deleteMyAccount = async (): Promise<void> => {
    await axiosInstance.delete("/profile/me");
};

export const updateMessageSetting = async (data: UpdateMessageSettingDto) => {
    return axiosInstance.put("/profile/me/message-setting", data);
};

// "AI hesaplarla etkilesim" ayari. Kapatilinca botlarin takibi de sunucuda kalkar.
/** Yalnizca KAPATIR (riza geri alma). */
export const updateAiInteraction = async (data: UpdateAiInteractionDto) => {
    return axiosInstance.put("/profile/me/ai-interaction", data);
};

/** AI etkilesimi acik riza onayi; guncel profili dondurur. */
export const giveAiConsent = async (data: AiConsentDto): Promise<Profile> => {
    const response = await axiosInstance.post<Profile>("/profile/me/ai-consent", data);
    return response.data;
};

// Gonderi gizliligi CANLI: bu ucun donusu sonrasi gecmis gonderiler de yeni
// ayara gore suzulur, gonderide saklanan bir kopya yok.
export const updatePostVisibility = async (data: UpdatePostVisibilityDto) => {
    return axiosInstance.put("/profile/me/post-visibility", data);
};

export const updatePostReplyPermission = async (data: UpdatePostReplyPermissionDto) => {
    return axiosInstance.put("/profile/me/post-reply-permission", data);
};

export const getProfileByUsername = (username: string): Promise<PublicProfile> => {
    return axiosInstance.get<PublicProfile>(`/profiles/${username}`).then((response) => response.data);
};
