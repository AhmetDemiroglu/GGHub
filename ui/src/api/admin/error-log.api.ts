import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import type { ErrorGroup, ErrorGroupDetail, ErrorLogQueryParams, ErrorLogStatus, ErrorLogSummary } from "@/models/admin/error-log.model";

export const getErrorGroups = (params: ErrorLogQueryParams) => {
    return axiosInstance.get<PaginatedResponse<ErrorGroup>>("/admin/errors", { params });
};

export const getErrorGroup = (id: number) => {
    return axiosInstance.get<ErrorGroupDetail>(`/admin/errors/${id}`);
};

export const getErrorSummary = () => {
    return axiosInstance.get<ErrorLogSummary>("/admin/errors/summary");
};

export const updateErrorStatus = (id: number, status: ErrorLogStatus, note?: string) => {
    return axiosInstance.put<ErrorGroup>(`/admin/errors/${id}/status`, { status, note });
};
