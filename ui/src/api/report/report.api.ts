import { axiosInstance } from "@core/lib/axios";
import type { ReportForCreation, MyReportSummary } from "@/models/report/report.model";

export const reportReview = (reviewId: number, data: ReportForCreation) => {
    return axiosInstance.post(`/report/review/${reviewId}`, data);
};
export const reportUser = (reportedUserId: number, data: ReportForCreation) => {
    return axiosInstance.post(`/report/user/${reportedUserId}`, data);
};
export const reportList = (listId: number, data: ReportForCreation) => {
    return axiosInstance.post(`/report/list/${listId}`, data);
};
export const reportComment = (commentId: number, data: ReportForCreation) => {
    return axiosInstance.post(`/report/comment/${commentId}`, data);
};
/** Inceleme yorumu raporu. Liste yorumundan AYRI bir uc nokta. */
export const reportReviewComment = (commentId: number, data: ReportForCreation) => {
    return axiosInstance.post(`/report/review-comment/${commentId}`, data);
};
export const getMyReports = () => {
    return axiosInstance.get<MyReportSummary[]>("/report/my-reports");
};
