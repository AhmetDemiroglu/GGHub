'use client';

// Değişiklik 1: 'next/navigation' dan useParams hook'unu import et
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getProfileByUsername } from '@/api/profile/profile.api';

// Değişiklik 2: Component artık prop almıyor
export default function ProfilePage() {
  // Değişiklik 3: useParams hook'unu kullanarak URL parametrelerini al
  const params = useParams();
  // username'in string olduğundan emin oluyoruz
  const username = params.username as string;

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    // Değişiklik 4: Hook'tan gelen 'username' değişkenini kullan
    queryKey: ['profile', username],
    queryFn: () => getProfileByUsername(username),
    // username mevcut değilse sorguyu çalıştırma (ekstra güvenlik)
    enabled: !!username,
  });

  if (isLoading) {
    return <div>Yükleniyor...</div>;
  }

  if (isError) {
    return <div>Hata: Profil yüklenemedi veya böyle bir kullanıcı bulunamadı.</div>;
  }

  return (
    <>
      {profile && (
        <div>
          <h1>{profile.username} Kullanıcısının Profili</h1>
          <hr />
          <h2>Gelen Veri (Test Amaçlı):</h2>
          <pre>{JSON.stringify(profile, null, 2)}</pre>
        </div>
      )}
    </>
  );
}