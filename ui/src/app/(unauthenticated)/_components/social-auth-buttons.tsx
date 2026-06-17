"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { GoogleLogin } from "@react-oauth/google";
import AppleSignin from "react-apple-signin-auth";
import { toast } from "sonner";
import { AxiosError, AxiosResponse } from "axios";
import { Apple } from "lucide-react";
import { googleLogin, appleLogin } from "@/api/auth/oauth.api";
import { useAuth } from "@core/hooks/use-auth";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { LoginResponse } from "@/models/auth/auth.model";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;

// Minimal shape of the response returned by react-apple-signin-auth.
interface AppleSignInResponse {
    authorization?: { id_token?: string; code?: string };
    user?: { name?: { firstName?: string; lastName?: string }; email?: string };
}

export function SocialAuthButtons() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login: authLogin } = useAuth();

    const returnUrl = searchParams.get("returnUrl") || buildLocalizedPathname("/", locale);

    const onSuccess = (res: AxiosResponse<LoginResponse>) => {
        toast.success(t("auth.loginSuccess"));
        authLogin(res.data);
        router.push(returnUrl);
    };

    const onError = (error: unknown) => {
        const axiosError = error as AxiosError<{ message?: string }>;
        const message = axiosError?.response?.data?.message || (error as Error)?.message || t("auth.loginDefaultError");
        toast.error(t("auth.loginErrorTitle"), { description: message });
    };

    const googleMutation = useMutation({ mutationFn: (idToken: string) => googleLogin(idToken), onSuccess, onError });
    const appleMutation = useMutation({
        mutationFn: (payload: { identityToken: string; fullName?: string }) => appleLogin(payload),
        onSuccess,
        onError,
    });

    // Render nothing until at least one provider is configured (keeps prod clean before credentials exist).
    if (!GOOGLE_CLIENT_ID && !APPLE_SERVICES_ID) {
        return null;
    }

    return (
        <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">{t("auth.orDivider")}</span>
                <span className="h-px flex-1 bg-border/60" />
            </div>

            <div className="flex flex-col items-center gap-3">
                {GOOGLE_CLIENT_ID ? (
                    <div className="overflow-hidden rounded-full">
                        <GoogleLogin
                            onSuccess={(cred) => {
                                if (cred.credential) googleMutation.mutate(cred.credential);
                            }}
                            onError={() => {
                                toast.error(t("auth.loginErrorTitle"));
                            }}
                            theme="filled_black"
                            shape="pill"
                            size="large"
                            text="continue_with"
                            logo_alignment="center"
                        />
                    </div>
                ) : null}

                {APPLE_SERVICES_ID ? (
                    <AppleSignin
                        authOptions={{
                            clientId: APPLE_SERVICES_ID,
                            scope: "name email",
                            redirectURI: typeof window !== "undefined" ? window.location.origin : "",
                            usePopup: true,
                        }}
                        uiType="dark"
                        onSuccess={(response: AppleSignInResponse) => {
                            const idToken = response?.authorization?.id_token;
                            if (!idToken) return;
                            const name = response?.user?.name
                                ? `${response.user.name.firstName ?? ""} ${response.user.name.lastName ?? ""}`.trim()
                                : undefined;
                            appleMutation.mutate({ identityToken: idToken, fullName: name || undefined });
                        }}
                        onError={() => {
                            toast.error(t("auth.loginErrorTitle"));
                        }}
                        render={(props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
                            <button
                                {...props}
                                type="button"
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-900"
                            >
                                <Apple className="h-4 w-4" />
                                {t("auth.continueWithApple")}
                            </button>
                        )}
                    />
                ) : null}
            </div>
        </div>
    );
}
