"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { register as registerApi } from "@/api/auth/auth.api";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { X, User, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Suspense } from "react";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";
import { SocialAuthButtons } from "../_components/social-auth-buttons";

function RegisterPageContent() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl") || "/";
    const formSchema = z.object({
        username: z.string().min(3, { message: t("auth.registerUsernameMin") }),
        email: z
            .string()
            .min(1, { message: t("auth.registerEmailRequired") })
            .refine((val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), { message: t("auth.registerEmailInvalid") }),
        password: z.string().min(6, { message: t("auth.registerPasswordMin") }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: registerApi,
        onSuccess: () => {
            router.push(`/login?registered=true&returnUrl=${encodeURIComponent(returnUrl)}`);
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as { isRateLimitError?: boolean } | undefined)?.isRateLimitError) {
                return;
            }

            const axiosError = error as AxiosError<{ message?: string }>;
            const errorMessage = axiosError?.response?.data?.message || (error as Error).message || t("auth.registerErrorDescription");
            toast.error(t("auth.registerErrorTitle"), {
                description: errorMessage,
            });
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutate(values);
    }

    return (
        <div className="relative w-full max-w-md">
            {/* Brand glow behind the card */}
            <div
                aria-hidden
                className="pointer-events-none absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-fuchsia-500/20 blur-2xl"
            />

            <Card className="relative overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-2xl backdrop-blur-xl">
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
                        <CardTitle className="text-xl font-semibold">{t("auth.registerCreateTitle")}</CardTitle>
                        <p className="text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-8 pt-2 sm:px-8">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.registerUsernameLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input className="h-11 pl-9" placeholder={t("auth.registerUsernamePlaceholder")} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.forgotPasswordEmailLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input className="h-11 pl-9" placeholder={t("auth.forgotPasswordEmailPlaceholder")} {...field} />
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

                            <Button
                                type="submit"
                                disabled={isPending}
                                className="h-11 w-full cursor-pointer rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-cyan-400 hover:to-violet-400 hover:shadow-violet-500/40"
                            >
                                {isPending ? t("auth.registerSubmitPending") : t("auth.registerCreateTitle")}
                            </Button>

                            <SocialAuthButtons />

                            <p className="pt-1 text-center text-sm text-muted-foreground">
                                {t("auth.registerHaveAccount")}
                                <Link
                                    href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
                                    className="ml-1 font-semibold text-cyan-400 underline-offset-4 hover:underline"
                                >
                                    {t("auth.loginTitle")}
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div />}>
            <RegisterPageContent />
        </Suspense>
    );
}
