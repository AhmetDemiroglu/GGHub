"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { AuthProvider } from "@core/contexts/auth-context";
import { toast } from "sonner";
import { AxiosError } from "axios";

const handleGlobalError = (error: unknown) => {
    if (error instanceof AxiosError) {
        if ((error as any).isBusinessError) {
            return;
        }
        if (error.response && (error.response as any).isRateLimitError) {
            toast.warning("Sunucu Yoğunluğu", {
                description: "Test sunucusunda anlık bir yoğunluk yaşanıyor. Lütfen 30 saniye bekleyip tekrar deneyin.",
                duration: 5000,
            });
        } else if (error.response?.status !== 401) {
            toast.error((error.response?.data as { message?: string })?.message || "Bir hata oluştu.");
        }
    } else if (error instanceof Error) {
        toast.error(error.message);
    }
};

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => {
                if (error instanceof AxiosError && (error.response?.status === 429 || error.response?.status === 401)) {
                    return false;
                }
                return failureCount < 3;
            },
        },
    },
});

queryClient.getQueryCache().config.onError = handleGlobalError;
queryClient.getMutationCache().config.onError = handleGlobalError;

export function Providers({ children }: { children: React.ReactNode }) {
    const [client] = useState(() => queryClient);

    return (
        <AuthProvider>
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </AuthProvider>
    );
}
