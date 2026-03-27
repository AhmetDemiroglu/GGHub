import { axiosInstance } from './client';
import type { UploadResponse } from '../models/photo';

export const uploadProfilePhoto = async (
  localUri: string,
): Promise<UploadResponse> => {
  const filename = localUri.split('/').pop() || 'profile.jpg';

  const extensionMatch = filename.match(/\.(\w+)$/);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  const mimeType = mimeMap[ext] || 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: `profile.${ext}`,
    type: mimeType,
  } as any);

  const response = await axiosInstance.post<UploadResponse>(
    '/photos/profile',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};
