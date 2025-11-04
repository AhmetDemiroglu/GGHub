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

const formSchema = z
    .object({
        token: z.string().length(6, { message: "Kod 6 haneli olmalıdır." }),
        newPassword: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
        confirmPassword: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Şifreler eşleşmiyor.",
        path: ["confirmPassword"],
    });

export default function ResetPasswordPage() {
    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { token: "", newPassword: "", confirmPassword: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            toast.success("Şifre Güncellendi!", {
                description: "Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.",
            });
            router.push("/login");
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as any).isRateLimitError) {
                return;
            }

            const axiosError = error as AxiosError<any>;
            const errorMessage = axiosError?.response?.data?.message || (error as Error).message || "Bir hata oluştu. Lütfen tekrar deneyin.";
            toast.error("İşlem Başarısız", {
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
                <Link href="/login" aria-label="Giriş Sayfasına Dön">
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>Şifre Sıfırla</CardTitle>
                    <CardDescription>E-postanıza gönderilen 6 haneli kodu girin ve yeni şifrenizi belirleyin.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="token"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Doğrulama Kodu</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="_ _ _ _ _ _" className="pl-10 text-center tracking-widest text-lg font-mono" maxLength={6} {...field} />
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
                                        <FormLabel>Yeni Şifre (Tekrar)</FormLabel>
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
                                {isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                <Link href="/forgot-password" className="underline font-bold underline-offset-4 hover:text-primary">
                                    Yeni kod gönder
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
