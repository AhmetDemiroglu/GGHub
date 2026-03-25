"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/api/auth/auth.api";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/core/components/ui/card";
import { X, Lock, KeyRound } from "lucide-react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useI18n } from "@/core/contexts/locale-context";

export default function ResetPasswordPage() {
    const t = useI18n();
    const router = useRouter();

    const formSchema = z
        .object({
            token: z.string().length(6, { message: t("auth.resetPasswordCodeLengthError") }),
            newPassword: z.string().min(6, { message: t("auth.resetPasswordPasswordLengthError") }),
            confirmPassword: z.string().min(6, { message: t("auth.resetPasswordPasswordLengthError") }),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: t("auth.resetPasswordPasswordMismatch"),
            path: ["confirmPassword"],
        });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { token: "", newPassword: "", confirmPassword: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            toast.success(t("auth.resetPasswordSuccessTitle"), {
                description: t("auth.resetPasswordSuccessDescription"),
            });
            router.push("/login");
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as any).isRateLimitError) {
                return;
            }

            const axiosError = error as AxiosError<{ message?: string }>;
            const errorMessage = axiosError?.response?.data?.message || (error as Error).message || t("auth.resetPasswordErrorDescription");
            toast.error(t("auth.resetPasswordErrorTitle"), {
                description: errorMessage,
            });
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutate({
            token: values.token,
            newPassword: values.newPassword,
        });
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-[400px] relative">
                <Link href="/login" aria-label={t("auth.backToLogin")}>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>{t("auth.resetPasswordTitle")}</CardTitle>
                    <CardDescription>{t("auth.resetPasswordDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="token"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.resetPasswordCodeLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder={t("auth.resetPasswordCodePlaceholder")} className="pl-10 text-center tracking-widest text-lg font-mono" maxLength={6} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.resetPasswordNewPasswordLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="password" className="pl-10" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.resetPasswordConfirmPasswordLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="password" className="pl-10" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                                {isPending ? t("common.loading") : t("auth.resetPasswordButton")}
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                <Link href="/forgot-password" className="underline font-bold underline-offset-4 hover:text-primary">
                                    {t("auth.resetPasswordNewCode")}
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
