export interface Profile {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  status: string | null;
  phoneNumber: string | null;
}

export interface ProfileForUpdate {
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
}