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

const formSchema = z.object({
    email: z
        .string()
        .min(1, { message: "E-posta alanı boş bırakılamaz." })
        .refine((val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), { message: "Lütfen geçerli bir e-posta adresi girin" }),
});

export default function ForgotPasswordPage() {
    const router = useRouter();
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: requestPasswordReset,
        onSuccess: () => {
            toast.success("Kod Gönderildi!", {
                description: "E-posta adresinize şifre sıfırlama kodu gönderildi.",
            });
            router.push("/reset-password");
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.message || "Bir hata oluştu. Lütfen tekrar deneyin.";
            toast.error("İstek Başarısız", {
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
                <Link href="/login" aria-label="Giriş Sayfasına Dön">
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>Şifremi Unuttum</CardTitle>
                    <CardDescription>E-posta adresinize şifre sıfırlama kodu göndereceğiz.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-posta</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input placeholder="ornek@gghub.com" className="pl-10" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                                {isPending ? "Gönderiliyor..." : "Kod Gönder"}
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                <Link href="/login" className="underline font-bold underline-offset-4 hover:text-primary">
                                    Giriş sayfasına dön
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
