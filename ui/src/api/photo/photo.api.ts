import { axiosInstance } from "@/core/lib/axios";
import type { UploadResponse } from "@/models/photo/photo.model";
export const uploadProfilePhoto = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<UploadResponse>("/photos/profile", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};
