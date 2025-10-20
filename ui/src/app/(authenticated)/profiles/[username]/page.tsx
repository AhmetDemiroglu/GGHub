"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProfileByUsername } from "@/api/profile/profile.api";
import ProfileHeader from "@core/components/other/profile/profile-header";
import { useAuthStore } from "@/core/stores/auth.store";

export default function ProfilePage() {
    const params = useParams();
    const username = params.username as string;
    const { user } = useAuthStore();

    const {
        data: profile,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ["profile", username],
        queryFn: () => getProfileByUsername(username),
        enabled: !!username,
    });

    const isOwnProfile = user?.username === username;

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
                    <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
                </div>
            )}
        </>
    );
}
