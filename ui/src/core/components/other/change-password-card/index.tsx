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

const formSchema = z
    .object({
        currentPassword: z.string().min(6, { message: "Mevcut şifrenizi girin." }),
        newPassword: z.string().min(6, { message: "Yeni şifre en az 6 karakter olmalıdır." }),
        confirmPassword: z.string().min(6),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Şifreler eşleşmiyor.",
        path: ["confirmPassword"],
    });

export function ChangePasswordCard() {
    const router = useRouter();
    const { logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success("Şifre Güncellendi!", {
                description: "Tüm oturumlarınız sonlandırıldı. Lütfen tekrar giriş yapın.",
            });
            logout();
            router.push("/login");
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || "Bir hata oluştu. Lütfen tekrar deneyin.";
            toast.error("Şifre Değiştirilemedi", {
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
                                <CardTitle className="text-base md:text-lg">Şifre Değiştir</CardTitle>
                                <CardDescription className="text-xs md:text-sm mt-1">Hesabınızın güvenliği için düzenli olarak şifrenizi değiştirin.</CardDescription>
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
                                            <FormLabel>Mevcut Şifre</FormLabel>
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
                                            <FormLabel>Yeni Şifre</FormLabel>
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
                                            <FormLabel>Yeni Şifre (Tekrar)</FormLabel>
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
                                        {isPending ? "Güncelleniyor..." : "Şifreyi Değiştir"}
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2 text-center">Şifrenizi değiştirdiğinizde tüm cihazlardaki oturumlarınız sonlandırılacaktır.</p>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
