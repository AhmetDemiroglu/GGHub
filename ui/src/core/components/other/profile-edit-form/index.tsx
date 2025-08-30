'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Profile } from '@/models/profile/profile.model';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile } from '@/api/profile/profile.api';
import { toast } from 'sonner';
import { Button } from '@/core/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/core/components/ui/form';
import { Input } from '@/core/components/ui/input';
import { Textarea } from '@/core/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/ui/card';

const formSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  bio: z.string().nullable(),
});

interface ProfileEditFormProps {
  initialData: Profile;
  onSave: () => void;
}

export function ProfileEditForm({ initialData, onSave }: ProfileEditFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData.firstName || '',
      lastName: initialData.lastName || '',
      bio: initialData.bio || '',
    },
  });
  const { mutate, isPending } = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedProfile) => {
      toast.success('Profil başarıyla güncellendi!');
      
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      onSave();
    },
    onError: (error) => {
      toast.error('Profil güncellenirken bir hata oluştu.', {
        description: error.message,
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profili Düzenle</CardTitle>
        <CardDescription>Değişikliklerinizi yapın ve kaydedin.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İsim</FormLabel>
                  <FormControl>
                    <Input placeholder="İsminiz" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soyisim</FormLabel>
                  <FormControl>
                    <Input placeholder="Soyisminiz" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Kendinizden bahsedin..."
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="cursor-pointer" type="submit" disabled={isPending}> 
                {isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'} 
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}