import { axiosInstance } from "@/core/lib/axios";
import type { HeaderUploadResponse, UploadResponse } from "@/models/photo/photo.model";

const EXTENSION_MAP: { [key: string]: string } = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function buildFormData(file: File, baseName: string): FormData {
  const formData = new FormData();
  const extension = EXTENSION_MAP[file.type] || ".jpg";
  formData.append("file", file, `${baseName}${extension}`);
  return formData;
}

export const uploadProfilePhoto = async (file: File): Promise<UploadResponse> => {
  const response = await axiosInstance.post<UploadResponse>(
    "/photos/profile",
    buildFormData(file, "profile"),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

export const uploadHeaderPhoto = async (file: File): Promise<HeaderUploadResponse> => {
  const response = await axiosInstance.post<HeaderUploadResponse>(
    "/photos/header",
    buildFormData(file, "header"),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

export const deleteHeaderPhoto = async (): Promise<void> => {
  await axiosInstance.delete("/photos/header");
};
