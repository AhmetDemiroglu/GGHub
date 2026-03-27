import { axiosInstance } from './client';
import type { PaginatedResponse } from '../models/api';
import type {
  UserListComment,
  UserListCommentForCreation,
  UserListCommentForUpdate,
  UserListCommentVote,
  ListQueryParameters,
} from '../models/list';

export const getListComments = (
  listId: number,
  params: ListQueryParameters,
): Promise<PaginatedResponse<UserListComment>> => {
  return axiosInstance
    .get<PaginatedResponse<UserListComment>>(
      `/userlistcomments/list/${listId}`,
      { params },
    )
    .then((response) => response.data);
};

export const createListComment = (
  listId: number,
  data: UserListCommentForCreation,
): Promise<UserListComment> => {
  return axiosInstance
    .post<UserListComment>(`/userlistcomments/list/${listId}`, data)
    .then((response) => response.data);
};

export const updateListComment = (
  commentId: number,
  data: UserListCommentForUpdate,
): Promise<void> => {
  return axiosInstance
    .put(`/userlistcomments/${commentId}`, data)
    .then((response) => response.data);
};

export const deleteListComment = (commentId: number): Promise<void> => {
  return axiosInstance
    .delete(`/userlistcomments/${commentId}`)
    .then((response) => response.data);
};

export const voteOnListComment = (
  commentId: number,
  data: UserListCommentVote,
): Promise<void> => {
  return axiosInstance
    .post(`/userlistcomments/${commentId}/vote`, data)
    .then((response) => response.data);
};
