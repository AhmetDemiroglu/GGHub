"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { requestPasswordReset } from "@/api/auth/auth.api";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/core/components/ui/card";
import { X, Mail } from "lucide-react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useI18n } from "@/core/contexts/locale-context";

export default function ForgotPasswordPage() {
    const t = useI18n();
    const router = useRouter();
    const formSchema = z.object({
        email: z
            .string()
            .min(1, { message: t("auth.forgotPasswordEmailRequired") })
            .refine((val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), { message: t("auth.forgotPasswordEmailInvalid") }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: requestPasswordReset,
        onSuccess: () => {
            toast.success(t("auth.forgotPasswordSuccessTitle"), {
                description: t("auth.forgotPasswordSuccessDescription"),
            });
            router.push("/reset-password");
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as any).isRateLimitError) {
                return;
            }

            const axiosError = error as AxiosError<{ message?: string }>;
            const errorMessage = axiosError?.response?.data?.message || (error as Error).message || t("auth.forgotPasswordErrorDescription");
            toast.error(t("auth.forgotPasswordErrorTitle"), {
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
                <Link href="/login" aria-label={t("auth.backToLogin")}>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>{t("auth.forgotPasswordTitle")}</CardTitle>
                    <CardDescription>{t("auth.forgotPasswordCardDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("auth.forgotPasswordEmailLabel")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder={t("auth.forgotPasswordEmailPlaceholder")} className="pl-10" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                                {isPending ? t("auth.forgotPasswordSubmitPending") : t("auth.forgotPasswordSubmit")}
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                <Link href="/login" className="underline font-bold underline-offset-4 hover:text-primary">
                                    {t("auth.backToLogin")}
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
