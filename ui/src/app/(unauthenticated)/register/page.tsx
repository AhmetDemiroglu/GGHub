'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod'; 
import * as z from 'zod'; 
import { useMutation } from '@tanstack/react-query'; 
import { register as registerApi } from '@/api/auth/auth.api';
import { Button } from '@/core/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/core/components/ui/form';
import { Input } from '@/core/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/core/components/ui/card';
import { X } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  username: z.string().min(3, { message: 'Kullanıcı adı en az 3 karakter olmalıdır.' }),
  email: z.string().min(1, { message: 'E-posta alanı boş bırakılamaz.'}).refine((val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), {message: 'Lütfen geçerli bir e-posta adresi girin'}),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function RegisterPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: registerApi, 
    onSuccess: () => {
      router.push('/login?registered=true');
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
                {isPending ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
              </Button>
              <p className="text-left text-sm text-muted-foreground">
                Zaten bir hesabın var mı?{" "}
                <Link
                  href="/login"
                  className="underline font-bold underline-offset-4 hover:text-primary"
                >
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