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
import { X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Suspense } from "react";
import { useI18n } from "@/core/contexts/locale-context";

function RegisterPageContent() {
    const t = useI18n();
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
            if (error instanceof AxiosError && (error.response as any).isRateLimitError) {
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
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-[400px] relative">
                <Link href="/" aria-label={t("auth.backToHome")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 h-6 w-6 cursor-pointer"
                        onClick={() => router.back()}
                        aria-label={t("common.back")}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>{t("auth.registerCreateTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.registerUsernameLabel")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("auth.registerUsernamePlaceholder")} {...field} />
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
                                            <Input placeholder={t("auth.forgotPasswordEmailPlaceholder")} {...field} />
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

                            <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                                {isPending ? t("auth.registerSubmitPending") : t("auth.registerCreateTitle")}
                            </Button>
                            <p className="text-left text-sm text-muted-foreground">
                                {t("auth.registerHaveAccount")}
                                <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} className="underline font-bold underline-offset-4 hover:text-primary ml-1">
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
