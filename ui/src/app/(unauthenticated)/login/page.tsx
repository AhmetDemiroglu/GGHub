"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AxiosError } from "axios";
import { X, Mail, Lock } from "lucide-react";
import { login as loginApi } from "@/api/auth/auth.api";
import { UserForLogin } from "@/models/auth/auth.model";
import { useAuth } from "@core/hooks/use-auth";
import { toast } from "sonner";
import { buildLocalizedPathname } from "@/i18n/config";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { SocialAuthButtons } from "../_components/social-auth-buttons";

function LoginPageContent() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login: authLogin } = useAuth();
    const returnUrl = useRef(searchParams.get("returnUrl") || buildLocalizedPathname("/", locale));

    const formSchema = z.object({
        email: z.string().min(1, { message: t("auth.validation.emailOrUsernameRequired") }),
        password: z.string().min(1, { message: t("auth.validation.passwordRequired") }),
    });

    useEffect(() => {
        const isRegistered = searchParams.get("registered");
        const isVerified = searchParams.get("verified");

        if (isVerified === "true") {
            toast.success(t("auth.accountVerifiedTitle"), {
                description: t("auth.accountVerifiedDescription"),
            });
        } else if (isVerified === "false") {
            toast.error(t("auth.accountVerificationFailedTitle"), {
                description: t("auth.accountVerificationFailedDescription"),
            });
        } else if (isRegistered === "true") {
            toast.success(t("auth.registrationSuccessTitle"), {
                description: t("auth.registrationSuccessDescription"),
            });
        } else {
            return;
        }

        router.replace(buildLocalizedPathname("/login", locale), { scroll: false });
    }, [searchParams, router, locale, t]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: UserForLogin) => loginApi(data),
        onSuccess: (response) => {
            toast.success(t("auth.loginSuccess"));
            authLogin(response.data);
            router.push(returnUrl.current);
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }

            const axiosError = error as AxiosError<{ message?: string }>;
            const errorMessage = axiosError?.response?.data?.message || (error as Error).message || t("auth.loginDefaultError");
            toast.error(t("auth.loginErrorTitle"), {
                description: errorMessage,
            });
        },
    });

    return (
        <div className="relative w-full max-w-md">
            {/* Brand glow behind the card */}
            <div
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-fuchsia-500/20 blur-2xl"
            />

            <Card className="relative overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
                {/* Top accent line */}
                <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

                <Link href={buildLocalizedPathname("/", locale)} aria-label={t("auth.backToHome")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-3 h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                        onClick={() => router.back()}
                        aria-label={t("common.back")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </Link>

                <CardHeader className="space-y-3 pb-2 pt-9 text-center">
                    <Link href={buildLocalizedPathname("/", locale)} className="mx-auto inline-flex select-none">
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-[2.6rem] font-extrabold leading-none tracking-tight text-transparent">
                            GGHub
                        </span>
                    </Link>
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-semibold">{t("auth.loginTitle")}</CardTitle>
                        <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-2 sm:px-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((values) => mutate(values))} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.loginEmailLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input className="h-11 pl-9" placeholder={t("auth.loginEmailPlaceholder")} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.passwordLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input type="password" className="h-11 pl-9" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="text-right">
                                <Link
                                    href={buildLocalizedPathname("/forgot-password", locale)}
                                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-cyan-400 hover:underline"
                                >
                                    {t("auth.forgotPassword")}
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                disabled={isPending}
                                className="h-11 w-full cursor-pointer rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-cyan-400 hover:to-violet-400 hover:shadow-violet-500/40"
                            >
                                {isPending ? t("auth.loginPending") : t("auth.loginTitle")}
                            </Button>

                            <SocialAuthButtons />

                            <p className="pt-1 text-center text-sm text-muted-foreground">
                                {t("auth.noAccount")}
                                <Link
                                    href={buildLocalizedPathname("/register", locale)}
                                    className="ml-1 font-semibold text-cyan-400 underline-offset-4 hover:underline"
                                >
                                    {t("auth.createAccount")}
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div />}>
            <LoginPageContent />
        </Suspense>
    );
}
