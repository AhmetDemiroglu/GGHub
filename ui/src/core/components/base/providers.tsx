"use client";

import React, { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { AuthProvider } from "@core/contexts/auth-context";
import { SignalRProvider } from "@core/contexts/signalr-context";
import { Messages, translate } from "@/i18n";
import { AppLocale } from "@/i18n/config";

type BusinessAwareError = AxiosError & {
    isBusinessError?: boolean;
    response?: AxiosError["response"] & {
        isRateLimitError?: boolean;
    };
};

const handleGlobalError = (error: unknown, t: (key: string) => string) => {
    if (error instanceof AxiosError) {
        const typedError = error as BusinessAwareError;
        if (typedError.isBusinessError) {
            return;
        }

        if (typedError.response?.isRateLimitError) {
            toast.warning(t("system.serverBusyTitle"), {
                description: t("system.serverBusyDescription"),
                duration: 5000,
            });
            return;
        }

        if (typedError.response?.status !== 401) {
            toast.error((typedError.response?.data as { message?: string } | undefined)?.message || t("common.genericError"));
        }
        return;
    }

    if (error instanceof Error) {
        toast.error(error.message);
    }
};

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 2 * 60 * 1000, // 2 dk — gereksiz refetch'leri önler
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
                if (error instanceof AxiosError && (error.response?.status === 429 || error.response?.status === 401)) {
                    return false;
                }

                return failureCount < 3;
            },
        },
    },
});

export function Providers({ children, locale, messages }: { children: React.ReactNode; locale: AppLocale; messages: Messages }) {
    const [client] = useState(() => queryClient);
    const tRef = React.useRef((key: string) => translate(messages, key));
    tRef.current = (key: string) => translate(messages, key);

    // Cache error handler'ları sadece bir kere ayarla, tRef üzerinden güncel t'ye eriş
    useEffect(() => {
        client.getQueryCache().config.onError = (error) => handleGlobalError(error, tRef.current);
        client.getMutationCache().config.onError = (error) => handleGlobalError(error, tRef.current);
    }, [client]);

    return (
        <AuthProvider locale={locale}>
            <QueryClientProvider client={client}>
                <SignalRProvider>{children}</SignalRProvider>
            </QueryClientProvider>
        </AuthProvider>
    );
}
