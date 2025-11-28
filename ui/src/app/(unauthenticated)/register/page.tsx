"use client";

import { useRouter } from "next/navigation";
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
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const formSchema = z.object({
    username: z.string().min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." }),
    email: z
        .string()
        .min(1, { message: "E-posta alanı boş bırakılamaz." })
        .refine((val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), { message: "Lütfen geçerli bir e-posta adresi girin" }),
    password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
});

function RegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get("returnUrl") || "/";
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

            const axiosError = error as AxiosError<any>;
            const errorMessage = axiosError?.response?.data?.message || (error as Error).message || "Kayıt sırasında bir hata oluştu.";
            toast.error("Kayıt Başarısız", {
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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 h-6 w-6 cursor-pointer"
                        onClick={() => router.back()}
                        aria-label="Geri Dön"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </Link>
                <CardHeader>
                    <CardTitle>Hesap Oluştur</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kullanıcı Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ornek_kullanici" {...field} />
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
                                {isPending ? "Hesap Oluşturuluyor..." : "Hesap Oluştur"}
                            </Button>
                            <p className="text-left text-sm text-muted-foreground">
                                Zaten bir hesabın var mı?
                                <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} className="underline font-bold underline-offset-4 hover:text-primary ml-1">
                                    Giriş Yap
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