export interface UserForRegister {
  username: string;
  email: string;
  password: string;
}

export interface UserForLogin {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'User' | 'Admin';
}