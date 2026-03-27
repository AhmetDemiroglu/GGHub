import { axiosInstance } from './client';
import type { ReportForCreation, MyReportSummary } from '../models/report';

export const reportReview = (
  reviewId: number,
  data: ReportForCreation,
) => {
  return axiosInstance.post(`/report/review/${reviewId}`, data);
};

export const reportUser = (
  reportedUserId: number,
  data: ReportForCreation,
) => {
  return axiosInstance.post(`/report/user/${reportedUserId}`, data);
};

export const reportList = (listId: number, data: ReportForCreation) => {
  return axiosInstance.post(`/report/list/${listId}`, data);
};

export const reportComment = (
  commentId: number,
  data: ReportForCreation,
) => {
  return axiosInstance.post(`/report/comment/${commentId}`, data);
};

export const getMyReports = () => {
  return axiosInstance.get<MyReportSummary[]>('/report/my-reports');
};
