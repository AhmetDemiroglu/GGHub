"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { changePassword } from "@/api/auth/auth.api";
import { useAuth } from "@core/hooks/use-auth";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Lock, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible";
import { buildLocalizedPathname } from "@/i18n/config";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

export function ChangePasswordCard() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const router = useRouter();
    const { logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const formSchema = z
        .object({
            currentPassword: z.string().min(6, { message: t("profile.changePassword.currentPasswordRequired") }),
            newPassword: z.string().min(6, { message: t("profile.changePassword.newPasswordRequired") }),
            confirmPassword: z.string().min(6, { message: t("profile.changePassword.confirmPasswordRequired") }),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: t("profile.changePassword.passwordsMustMatch"),
            path: ["confirmPassword"],
        });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success(t("profile.changePassword.successTitle"), {
                description: t("profile.changePassword.successDescription"),
            });
            logout();
            router.push(buildLocalizedPathname("/login", locale));
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || t("profile.changePassword.errorDescription");
            toast.error(t("profile.changePassword.errorTitle"), {
                description: errorMessage,
            });
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        mutate({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
        });
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <Card>
                <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer p-4 md:p-6">
                        <div className="flex items-start md:items-center justify-between gap-3">
                            <div className="text-left flex-1 min-w-0">
                                <CardTitle className="text-base md:text-lg">{t("profile.changePassword.title")}</CardTitle>
                                <CardDescription className="text-xs md:text-sm mt-1">{t("profile.changePassword.description")}</CardDescription>
                            </div>
                            {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="p-4 md:p-6">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("profile.changePassword.currentPasswordLabel")}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type={showCurrentPassword ? "text" : "password"} className="pl-10 pr-10" {...field} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
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
                                            <FormLabel>{t("profile.changePassword.newPasswordLabel")}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type={showNewPassword ? "text" : "password"} className="pl-10 pr-10" {...field} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
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
                                            <FormLabel>{t("profile.changePassword.confirmPasswordLabel")}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type={showConfirmPassword ? "text" : "password"} className="pl-10 pr-10" {...field} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="pt-2">
                                    <Button type="submit" className="w-full cursor-pointer" disabled={isPending} variant="destructive">
                                        {isPending ? t("profile.changePassword.saving") : t("profile.changePassword.submit")}
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2 text-center">{t("profile.changePassword.note")}</p>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
