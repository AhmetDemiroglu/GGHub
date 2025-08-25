import axiosInstance from "@core/lib/axios";
import { UserForLogin, UserForRegister, LoginResponse } from '@/models/auth/auth.model';

export const register = (data: UserForRegister) => {
  return axiosInstance.post('/api/auth/register', data);
};

export const login = (data: UserForLogin) => {
  return axiosInstance.post<LoginResponse>('/api/auth/login', data);
};
