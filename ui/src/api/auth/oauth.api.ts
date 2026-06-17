import { axiosInstance } from "@core/lib/axios";
import { LoginResponse } from "@/models/auth/auth.model";

export const googleLogin = (payload: { idToken?: string; accessToken?: string }) => {
    return axiosInstance.post<LoginResponse>("/auth/google", payload);
};

export const appleLogin = (payload: { identityToken: string; fullName?: string; nonce?: string }) => {
    return axiosInstance.post<LoginResponse>("/auth/apple", payload);
};
