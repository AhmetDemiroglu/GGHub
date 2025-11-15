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
    role: "User" | "Admin";
    profileImageUrl: string | null;
}

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordReset {
    token: string;
    newPassword: string;
}

export interface ChangePassword {
    currentPassword: string;
    newPassword: string;
}
