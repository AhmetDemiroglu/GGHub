'use client';

import { getMyProfile } from '@/api/profile/profile.api';
import { AuthProvider } from '@/core/components/base/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/ui/card';
import { Skeleton } from '@/core/components/ui/skeleton';
import { useState } from 'react';
import { Button } from '@/core/components/ui/button';
import { Pencil } from 'lucide-react';
import { ProfileEditForm } from '@/core/components/other/profile-edit-form';
import { Profile } from '@/models/profile/profile.model';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
  });

  if (isLoading) {
    return (
      <AuthProvider>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </AuthProvider>
    );
  }

  if (isError) {
    return (
      <AuthProvider>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Hata</CardTitle>
            <CardDescription>Profil bilgileri yüklenirken bir sorun oluştu.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error.message}</p>
          </CardContent>
        </Card>
      </AuthProvider>
    );
  }

  if (!data) {
    return null; 
  }
  const ProfileReadOnlyView = ({ data }: { data: Profile }) => (
    <div className="space-y-2">
        <p><strong>Kullanıcı Adı:</strong> {data.username}</p>
        <p><strong>E-posta:</strong> {data.email}</p>
        <p><strong>İsim:</strong> {data.firstName || 'Belirtilmemiş'}</p>
        <p><strong>Soyisim:</strong> {data.lastName || 'Belirtilmemiş'}</p>
        <p><strong>Bio:</strong> {data.bio || 'Bio eklenmemiş.'}</p>
        <p><strong>Üyelik Tarihi:</strong> {new Date(data.createdAt).toLocaleDateString('tr-TR')}</p>
    </div>
  );
  return (
    <AuthProvider>
      <div className="w-full p-5">
        <div className="space-y-4">
            {/* Başlık */}
            <div>
            <h1 className="text-3xl font-bold">Profil Yönetimi</h1>
            <p className="text-muted-foreground mt-2">
                Kişisel bilgilerinizi, gizlilik ayarlarınızı ve daha fazlasını buradan yönetin.
            </p>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Kişisel Bilgiler</CardTitle>
                        <CardDescription>Bu bilgiler herkese açık profilinizde görünebilir.</CardDescription>
                    </div>
                        <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                    <ProfileEditForm 
                    initialData={data} 
                    onSave={() => setIsEditing(false)} 
                    />
                ) : (
                    <ProfileReadOnlyView data={data} />
                )}
              </CardContent>
            </Card>
            
            {/* İLERİDE BURAYA YENİ KARTLAR GELECEK (Gizlilik Ayarları, Şifre Değiştirme vb.) */}

        </div>
      </div>
    </AuthProvider>
  ); 
}