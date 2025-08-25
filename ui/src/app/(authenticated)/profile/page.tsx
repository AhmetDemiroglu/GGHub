import { AuthProvider } from "@/core/components/base/auth-provider";

export default function ProfilePage() {
  return (
    <AuthProvider>
      <div>
        <h1>Profil Sayfam</h1>
        <p>Bu içeriği sadece giriş yapmış kullanıcılar görebilir.</p>
      </div>
    </AuthProvider>
  );
}