import { Metadata } from "next";
import ProfileContent from "@core/components/other/profile/profile-content";

type Props = {
    params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;

    const baseUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` || "https://localhost:7263/api";

    try {
        const response = await fetch(`${baseUrl}/profiles/${username}`, {
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            return {
                title: "Kullanıcı Bulunamadı - GGHub",
                description: "Profil görüntülenemiyor.",
            };
        }

        const profile = await response.json();
        const displayName = profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : profile.username;

        return {
            title: `${displayName} (@${profile.username}) - GGHub`,
            description: profile.bio || `${displayName} kullanıcısının GGHub profili.`,
            openGraph: {
                title: `${displayName} - GGHub Profili`,
                description: profile.bio || "GGHub profili.",
                images: profile.profileImageUrl ? [profile.profileImageUrl] : [],
            },
        };
    } catch (error) {
        return {
            title: "GGHub Profil",
        };
    }
}

export default async function Page({ params }: Props) {
    const { username } = await params;
    return <ProfileContent username={username} />;
}