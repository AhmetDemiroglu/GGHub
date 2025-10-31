import { axiosInstance } from "@/core/lib/axios";
import type { UploadResponse } from "@/models/photo/photo.model";

export const uploadProfilePhoto = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    const extensionMap: { [key: string]: string } = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
    };
    
    const extension = extensionMap[file.type] || ".jpg"; 
    const fileName = `profile${extension}`; 
    formData.append("file", file, fileName);

    const response = await axiosInstance.post<UploadResponse>("/photos/profile", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data;
};