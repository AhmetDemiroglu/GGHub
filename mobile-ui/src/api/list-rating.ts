import { axiosInstance } from './client';
import type {
  UserListRatingForUpsert,
  UserListRatingResponse,
} from '../models/list';

export const submitListRating = (
  listId: number,
  data: UserListRatingForUpsert,
): Promise<void> => {
  return axiosInstance
    .post(`/userlistratings/${listId}`, data)
    .then((response) => response.data);
};

export const getMyListRating = (
  listId: number,
): Promise<UserListRatingResponse> => {
  return axiosInstance
    .get<UserListRatingResponse>(`/userlistratings/${listId}/my-rating`)
    .then((response) => response.data);
};
