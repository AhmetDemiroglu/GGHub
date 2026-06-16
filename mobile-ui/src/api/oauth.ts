import { axiosInstance } from './client';
import type { LoginResponse } from '../models/auth';

export const googleLogin = (idToken: string) => {
  return axiosInstance.post<LoginResponse>('/auth/google', { idToken });
};

export const appleLogin = (payload: {
  identityToken: string;
  fullName?: string;
  nonce?: string;
}) => {
  return axiosInstance.post<LoginResponse>('/auth/apple', payload);
};
