"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AxiosError } from "axios";
import { X } from "lucide-react";
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
        <div className="flex min-h-screen items-center justify-center">
            <Card className="relative w-[400px]">
                <Link href={buildLocalizedPathname("/", locale)} aria-label={t("auth.backToHome")}>
                    <Button variant="ghost" size="icon" className="absolute right-4 top-4 h-6 w-6 cursor-pointer" onClick={() => router.back()} aria-label={t("common.back")}>
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>{t("auth.loginTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((values) => mutate(values))} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.loginEmailLabel")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("auth.loginEmailPlaceholder")} {...field} />
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
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="text-right">
                                <Link href={buildLocalizedPathname("/forgot-password", locale)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary">
                                    {t("auth.forgotPassword")}
                                </Link>
                            </div>

                            <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                                {isPending ? t("auth.loginPending") : t("auth.loginTitle")}
                            </Button>
                            <p className="text-left text-sm text-muted-foreground">
                                {t("auth.noAccount")}
                                <Link href={buildLocalizedPathname("/register", locale)} className="ml-1 font-bold underline underline-offset-4 hover:text-primary">
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
