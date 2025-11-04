import { axiosInstance } from "@core/lib/axios";
import { UserForLogin, UserForRegister, LoginResponse, PasswordResetRequest, PasswordReset, ChangePassword } from "@/models/auth/auth.model";

export const register = (data: UserForRegister) => {
    return axiosInstance.post("/auth/register", data);
};

export const login = (data: UserForLogin) => {
    return axiosInstance.post<LoginResponse>("/auth/login", data);
};

export const requestPasswordReset = (data: PasswordResetRequest) => {
    return axiosInstance.post("/auth/forgot-password", data);
};

export const resetPassword = (data: PasswordReset) => {
    return axiosInstance.post("/auth/reset-password", data);
};

export const changePassword = (data: ChangePassword) => {
  return axiosInstance.post('/auth/change-password', data);
};
