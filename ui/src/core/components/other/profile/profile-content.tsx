"use client";

import { useQuery } from "@tanstack/react-query";
import { getProfileByUsername } from "@/api/profile/profile.api";
import ProfileHeader from "./profile-header";
import ProfileReviews from "./profile-reviews";
import { useAuth } from "@core/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Loader2, LayoutDashboard, Star, Library, Users } from "lucide-react";
import ProfileLists from "./profile-lists";
import ProfileNetwork from "./profile-network";

interface ProfileContentProps {
    username: string;
}

export default function ProfileContent({ username }: ProfileContentProps) {
    const { user } = useAuth();

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
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-semibold">Profil bulunamadı</h2>
                <p className="text-muted-foreground">Aradığınız kullanıcı mevcut değil veya erişim izniniz yok.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full p-5">
            <div className="space-y-4">
                <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
                <Tabs defaultValue="overview" className="w-ful">
                    <TabsList className="w-full flex flex-nowrap overflow-x-auto justify-start border-b bg-transparent p-1 h-14 space-x-0 mb-4 no-scrollbar">
                        {/* 1. GENEL BAKIŞ */}
                        <TabsTrigger
                            value="overview"
                            className="cursor-pointer group relative flex items-center gap-2 h-full rounded-none border-b-2 border-transparent px-6 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:bg-muted/30"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            <span className="font-semibold">Genel Bakış</span>
                        </TabsTrigger>

                        {/* 2. İNCELEMELER */}
                        <TabsTrigger
                            value="reviews"
                            className="cursor-pointer group relative flex items-center gap-2 h-full rounded-none border-b-2 border-transparent px-6 text-muted-foreground transition-all hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 data-[state=active]:border-amber-500 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-950/30"
                        >
                            <Star className="h-4 w-4 group-data-[state=active]:fill-current transition-colors" />
                            <span className="font-semibold">İncelemeler</span>
                            {(profile.reviewCount || 0) > 0 && (
                                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-bold group-data-[state=active]:bg-amber-100 group-data-[state=active]:text-amber-700 dark:group-data-[state=active]:bg-amber-900/40 dark:group-data-[state=active]:text-amber-300">
                                    {profile.reviewCount}
                                </span>
                            )}
                        </TabsTrigger>

                        {/* 3. LİSTELER */}
                        <TabsTrigger
                            value="lists"
                            className="cursor-pointer group relative flex items-center gap-2 h-full rounded-none border-b-2 border-transparent px-6 text-muted-foreground transition-all hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30"
                        >
                            <Library className="h-4 w-4" />
                            <span className="font-semibold">Listeler</span>
                            {(profile.listCount || 0) > 0 && (
                                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-muted px-1.5 text-[11px] font-bold group-data-[state=active]:bg-blue-100 group-data-[state=active]:text-blue-700 dark:group-data-[state=active]:bg-blue-900/40 dark:group-data-[state=active]:text-blue-300">
                                    {profile.listCount}
                                </span>
                            )}
                        </TabsTrigger>

                        {/* 4. AĞ */}
                        <TabsTrigger
                            value="network"
                            className="cursor-pointer group relative flex items-center gap-2 h-full rounded-none border-b-2 border-transparent px-6 text-muted-foreground transition-all hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/20 data-[state=active]:border-purple-500 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-950/30"
                        >
                            <Users className="h-4 w-4" />
                            <span className="font-semibold">Ağ</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* --- İÇERİKLER --- */}

                    <TabsContent value="overview" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        <div className="p-8 border-2 border-dashed border-muted rounded-xl bg-muted/10 text-center flex flex-col items-center justify-center min-h-[300px]">
                            <div className="bg-background p-4 rounded-full shadow-sm mb-4">
                                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">Genel Bakış Paneli</h3>
                            <p className="text-muted-foreground max-w-sm mt-2">Bu alan Faz 3 kapsamında geliştirilecektir. Kullanıcının son aktiviteleri ve öne çıkan istatistikleri burada yer alacak.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="reviews" className="mt-0 mb-1 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        <ProfileReviews username={profile.username} />
                    </TabsContent>

                    <TabsContent value="lists" className="mt-0 mb-1 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        <ProfileLists username={profile.username} />
                    </TabsContent>

                    <TabsContent value="network" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                        <ProfileNetwork username={profile.username} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}