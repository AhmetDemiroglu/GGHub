"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useGoogleLogin } from "@react-oauth/google";
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

const socialButtonClass =
    "inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-border/60 bg-secondary/40 text-sm font-medium text-foreground transition-colors hover:border-border hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-60";

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}

// Isolated so useGoogleLogin only runs when GoogleOAuthProvider is present (i.e. client id configured).
function GoogleButton({ onAccessToken, disabled }: { onAccessToken: (token: string) => void; disabled?: boolean }) {
    const t = useI18n();
    const login = useGoogleLogin({
        scope: "openid email profile",
        onSuccess: (resp) => onAccessToken(resp.access_token),
        onError: () => toast.error(t("auth.loginErrorTitle")),
    });

    return (
        <button type="button" className={socialButtonClass} disabled={disabled} onClick={() => login()}>
            <GoogleIcon />
            {t("auth.continueWithGoogle")}
        </button>
    );
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

    const googleMutation = useMutation({ mutationFn: (accessToken: string) => googleLogin({ accessToken }), onSuccess, onError });
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
        <div className="mt-5 space-y-3">
            <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">{t("auth.orDivider")}</span>
                <span className="h-px flex-1 bg-border/60" />
            </div>

            {GOOGLE_CLIENT_ID ? <GoogleButton onAccessToken={(token) => googleMutation.mutate(token)} disabled={googleMutation.isPending} /> : null}

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
                        <button {...props} type="button" className={socialButtonClass}>
                            <Apple className="h-[18px] w-[18px]" />
                            {t("auth.continueWithApple")}
                        </button>
                    )}
                />
            ) : null}
        </div>
    );
}
