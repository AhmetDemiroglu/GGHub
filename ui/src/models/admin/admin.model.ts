import { ListVisibilitySetting } from "@/models/list/list.model";
import {ReportStatus} from "@/models/report/report.model";
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

export interface AdminUserListSummary {
  id: number;
  name: string;
  visibility: ListVisibilitySetting; 
  followerCount: number;
  gameCount: number;
  averageRating: number;
  createdAt: string;
}
export interface AdminReviewSummary {
  id: number;
  gameName: string;
  gameId: number;
  rating: number;
  content: string;
  createdAt: string;
}
export interface AdminCommentSummary {
  id: number;
  listName: string;
  listId: number;
  contentPreview: string;
  fullContent: string;
  visibility: ListVisibilitySetting;
  createdAt: string; 
}
export interface AdminUserReportSummary {
  reportId: number;
  entityType: string;
  entityId: number;
  reason: string;
  status: ReportStatus; 
  reportedAt: string; 
}
export interface UserFilterParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilter?: "All" | "Active" | "Banned";
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  startDate?: Date;
  endDate?: Date;
}
