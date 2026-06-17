import { axiosInstance } from './client';
import type { HeaderUploadResponse, UploadResponse } from '../models/photo';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

function buildFormData(localUri: string, baseName: string): FormData {
  const filename = localUri.split('/').pop() || `${baseName}.jpg`;
  const extensionMatch = filename.match(/\.(\w+)$/);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';
  const mimeType = MIME_MAP[ext] || 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: `${baseName}.${ext}`,
    type: mimeType,
  } as any);
  return formData;
}

export const uploadProfilePhoto = async (
  localUri: string,
): Promise<UploadResponse> => {
  const response = await axiosInstance.post<UploadResponse>(
    '/photos/profile',
    buildFormData(localUri, 'profile'),
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

export const uploadHeaderPhoto = async (
  localUri: string,
): Promise<HeaderUploadResponse> => {
  const response = await axiosInstance.post<HeaderUploadResponse>(
    '/photos/header',
    buildFormData(localUri, 'header'),
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

export const deleteHeaderPhoto = async (): Promise<void> => {
  await axiosInstance.delete('/photos/header');
};
