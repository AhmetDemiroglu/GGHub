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

const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 2 * 60 * 1000, // 2 dk: gereksiz refetch'leri önler
                refetchOnWindowFocus: false,
                retry: (failureCount, error) => {
                    if (error instanceof AxiosError) {
                        if (error.response?.status === 429 || error.response?.status === 401) {
                            return false;
                        }

                        // Ağ hatası / timeout (response YOK) = sunucu yavaş veya erişilemiyor.
                        // Eskiden buradan failureCount < 3'e düşülüyordu: 4 deneme x 15 sn axios
                        // timeout + exponential backoff, uygulamayı ~60 sn "hiç açılmıyor" gibi
                        // gösteriyordu. Bu senaryoda tekrar denemek nadiren işe yarar, tek retry yeter.
                        if (!error.response) {
                            return failureCount < 1;
                        }
                    }

                    return failureCount < 3;
                },
                // Backoff'u sınırla: varsayılan üstel gecikme uzun beklemelere yol açıyordu.
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
            },
        },
    });

export function Providers({ children, locale, messages }: { children: React.ReactNode; locale: AppLocale; messages: Messages }) {
    // Modül seviyesinde tek bir QueryClient tutuluyordu. Tarayıcıda sorun değil ama modül
    // SSR sırasında da değerlendiriliyor: aynı Node process'indeki farklı kullanıcıların
    // istekleri aynı cache'i paylaşabilir. useState içinde üretmek her render ağacına
    // kendi client'ını verir.
    const [client] = useState(createQueryClient);
    const tRef = React.useRef((key: string) => translate(messages, key));
    tRef.current = (key: string) => translate(messages, key);

    // Cache error handler'ları sadece bir kere ayarla, tRef üzerinden güncel t'ye eriş
    useEffect(() => {
        client.getQueryCache().config.onError = (error) => handleGlobalError(error, tRef.current);
        client.getMutationCache().config.onError = (error) => handleGlobalError(error, tRef.current);
    }, [client]);

    // GoogleOAuthProvider buradan kaldırıldı: GSI script'i (97 KB) her sayfada iniyordu.
    // Artık yalnızca (unauthenticated) route grubunda, GoogleOAuthBoundary üzerinden yükleniyor.
    // Sıra bilerek QueryClientProvider > AuthProvider: AuthProvider logout'ta cache'i
    // temizlemek için useQueryClient() kullanıyor, dolayısıyla altında olmak zorunda.
    return (
        <QueryClientProvider client={client}>
            <AuthProvider locale={locale}>
                <SignalRProvider>{children}</SignalRProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}
