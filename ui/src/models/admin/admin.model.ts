export enum ReportStatus {
    Open = 0,
    Resolved = 1,
    Ignored = 2,
}
export interface DashboardStats {
    totalUsers: number;
    bannedUsers: number;
    pendingReports: number;
    totalLists: number;
    totalReviews: number;
}
export interface UserFilterParams {
    page?: number;
    pageSize?: number;
    searchTerm?: string;
    statusFilter?: "All" | "Active" | "Banned";
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    [key: string]: any;
}

export interface AdminUserSummary {
    id: number;
    username: string;
    email: string;
    role: string;
    isBanned: boolean;
    isEmailVerified: boolean;
    createdAt: string;
    profileImageUrl: string | null;
}
export interface AdminUserDetails {
    id: number;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    profileImageUrl: string | null;
    dateOfBirth: string | null;
    isEmailVerified: boolean;
    isBanned: boolean;
    bannedAt: string | null;
    banReason: string | null;
}
export interface BanUserRequest {
    reason: string;
}
export interface ChangeRoleRequest {
    newRole: "Admin" | "User";
}
export interface AdminReport {
    reportId: number;
    entityType: string;
    entityId: number;
    reason: string;
    status: ReportStatus;
    reportedAt: string;
    reporterId: number;
    reporterUsername: string;
}
export interface UpdateReportStatusRequest {
    newStatus: ReportStatus;
}
export interface RecentReview {
  id: number;
  username: string;
  userProfileImageUrl: string | null;
  gameName: string;
  gameId: number;
  rating: number;
  createdAt: string;
}
