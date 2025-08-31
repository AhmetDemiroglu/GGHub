import { axiosInstance } from '@/core/lib/axios';

interface UploadResponse {
  profileImageUrl: string;
}

export const uploadProfilePhoto = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosInstance.post<UploadResponse>('/photos/profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};