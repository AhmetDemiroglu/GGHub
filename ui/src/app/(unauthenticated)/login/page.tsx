"use client";

import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login as loginApi } from "@/api/auth/auth.api";
import { useAuth } from "@core/hooks/use-auth";
import { UserForLogin } from "@/models/auth/auth.model";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form";
import { Input } from "@/core/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { X } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
    email: z
        .string()
        .min(1, { message: "E-posta alanı boş bırakılamaz." })
        .refine((val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), { message: "Lütfen geçerli bir e-posta adresi girin" }),
    password: z.string().min(1, { message: "Şifre boş bırakılamaz." }),
});

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login: authLogin } = useAuth();
    const toastShownRef = useRef(false);

    useEffect(() => {
        if (toastShownRef.current === false) {
            const isRegistered = searchParams.get("registered");
            if (isRegistered) {
                toast.success("Kayıt başarılı!", {
                    description: "Doğrulama linki e-posta adresinize gönderildi.",
                });
                toastShownRef.current = true;
            }
        }
    }, [searchParams]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    });

    const { mutate, isPending, error } = useMutation({
        mutationFn: (data: UserForLogin) => loginApi(data),
        onSuccess: (response) => {
            toast.success("Başarıyla giriş yapıldı!");
            authLogin(response.data);
            router.push("/");
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data || "Bir hata oluştu. Lütfen tekrar deneyin.";
            toast.error("Giriş Başarısız", {
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
                <Link href="/" aria-label="Ana Sayfaya Dön">
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>Giriş Yap</CardTitle>
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
                                            <Input placeholder="ornek@gghub.com" {...field} />
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
                                        <FormLabel>Şifre</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full cursor-pointer" disabled={isPending}>
                                {isPending ? "Giriş Yapılıyor..." : "Giriş Yap"}
                            </Button>
                            <p className="text-left text-sm text-muted-foreground">
                                Hesabın yok mu?{" "}
                                <Link href="/register" className="underline font-bold underline-offset-4 hover:text-primary">
                                    Kayıt Ol
                                </Link>
                            </p>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
