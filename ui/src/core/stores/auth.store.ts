import { create } from "zustand";
import { persist } from "zustand/middleware";
import { jwtDecode } from "jwt-decode";
import { AuthenticatedUser } from "@/models/auth/auth.model";
import { queryClient } from "@core/components/base/providers";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    user: AuthenticatedUser | null;
    login: (tokens: { accessToken: string; refreshToken: string }) => void;
    logout: () => void;
}

interface DecodedToken {
    nameid: string;
    unique_name: string;
    role: "User" | "Admin";
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            user: null,
            login: ({ accessToken, refreshToken }) => {
                const decodedToken = jwtDecode<DecodedToken>(accessToken);
                set({
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    user: {
                        id: decodedToken.nameid,
                        username: decodedToken.unique_name,
                        role: decodedToken.role,
                    },
                });
            },
            logout: () => {
                set({
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    user: null,
                });
                queryClient.removeQueries({ queryKey: ["my-profile"] });
            },
        }),
        {
            name: "auth-storage",
        }
    )
);
