import { axiosInstance } from "@core/lib/axios";
import type { PaginatedResponse } from "@/models/system/api.model";
import type {
    DashboardStats,
    UserFilterParams,
    AdminUserSummary,
    AdminUserDetails,
    BanUserRequest,
    ChangeRoleRequest,
    AdminReport,
    UpdateReportStatusRequest,
    RecentReview,
    AdminUserListSummary,
    AdminReviewSummary,
    AdminCommentSummary,
    AdminUserReportSummary,
} from "@/models/admin/admin.model";
export const getDashboardStats = () => {
    return axiosInstance.get<DashboardStats>("/admin/dashboard-stats");
};
export const getReports = () => {
    return axiosInstance.get<AdminReport[]>("/admin/reports");
};
export const updateReportStatus = (reportId: number, data: UpdateReportStatusRequest) => {
    return axiosInstance.put(`/admin/reports/${reportId}/status`, data);
};
export const getUsers = (params: UserFilterParams) => {
    return axiosInstance.get<PaginatedResponse<AdminUserSummary>>("/admin/users", {
        params,
    });
};
export const getUserDetails = (userId: number) => {
    return axiosInstance.get<AdminUserDetails>(`/admin/users/${userId}`);
};
export const banUser = (userId: number, data: BanUserRequest) => {
    return axiosInstance.post(`/admin/users/${userId}/ban`, data);
};
export const unbanUser = (userId: number) => {
    return axiosInstance.post(`/admin/users/${userId}/unban`);
};
export const changeUserRole = (userId: number, data: ChangeRoleRequest) => {
    return axiosInstance.put(`/admin/users/${userId}/role`, data);
};
export const getRecentUsers = (count: number = 5) => {
    return axiosInstance.get<AdminUserSummary[]>("/admin/recent-users", {
        params: { count },
    });
};
export const getRecentReviews = (count: number = 5) => {
    return axiosInstance.get<RecentReview[]>("/admin/recent-reviews", {
        params: { count },
    });
};
export const getListsForUser = (userId: number) => {
    return axiosInstance.get<AdminUserListSummary[]>(`/admin/users/${userId}/lists`);
};
export const getReviewsForUser = (userId: number) => {
    return axiosInstance.get<AdminReviewSummary[]>(`/admin/users/${userId}/reviews`);
};
export const getCommentsForUser = (userId: number) => {
    return axiosInstance.get<AdminCommentSummary[]>(`/admin/users/${userId}/comments`);
};
export const getReportsMadeByUser = (userId: number) => {
    return axiosInstance.get<AdminUserReportSummary[]>(`/admin/users/${userId}/reports-made`);
};
