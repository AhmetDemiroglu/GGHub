"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { GoogleLogin } from "@react-oauth/google";
import AppleSignin from "react-apple-signin-auth";
import { toast } from "sonner";
import { AxiosError, AxiosResponse } from "axios";
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
        <div className="mt-4 space-y-3">
            <div className="relative flex items-center">
                <div className="flex-grow border-t border-border" />
                <span className="mx-3 text-xs uppercase text-muted-foreground">{t("auth.orDivider")}</span>
                <div className="flex-grow border-t border-border" />
            </div>

            {GOOGLE_CLIENT_ID ? (
                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={(cred) => {
                            if (cred.credential) googleMutation.mutate(cred.credential);
                        }}
                        onError={() => toast.error(t("auth.loginErrorTitle"))}
                        text="continue_with"
                        width="352"
                        locale={locale === "tr" ? "tr" : "en"}
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
                    onError={() => toast.error(t("auth.loginErrorTitle"))}
                    render={(props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
                        <button
                            {...props}
                            type="button"
                            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-black text-sm font-medium text-white"
                        >
                            {t("auth.continueWithApple")}
                        </button>
                    )}
                />
            ) : null}
        </div>
    );
}
