"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFollowers, getFollowing, followUser, unfollowUser } from "@/api/social/social.api";
import { Loader2, UserMinus, UserPlus, Users, UserCheck } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Button } from "@/core/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/core/hooks/use-auth";

// Modal'daki ile aynı interface (Social API dönüş tipi)
interface SocialUser {
    id: number;
    username: string;
    profileImageUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    isFollowing: boolean;
    isProfileAccessible: boolean;
}

interface ProfileNetworkProps {
    username: string;
}

export default function ProfileNetwork({ username }: ProfileNetworkProps) {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"followers" | "following">("followers");

    const { data: followers, isLoading: followersLoading } = useQuery({
        queryKey: ["followers", username],
        queryFn: () => getFollowers(username),
        enabled: activeTab === "followers",
    });

    const { data: following, isLoading: followingLoading } = useQuery({
        queryKey: ["following", username],
        queryFn: () => getFollowing(username),
        enabled: activeTab === "following",
    });

    const followMutation = useMutation({
        mutationFn: (targetUsername: string) => followUser(targetUsername),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["followers", username] });
            queryClient.invalidateQueries({ queryKey: ["following", username] });
            toast.success("Kullanıcı takip edildi");
        },
        onError: () => toast.error("İşlem başarısız")
    });

    const unfollowMutation = useMutation({
        mutationFn: (targetUsername: string) => unfollowUser(targetUsername),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["followers", username] });
            queryClient.invalidateQueries({ queryKey: ["following", username] });
            toast.success("Takip bırakıldı");
        },
        onError: () => toast.error("İşlem başarısız")
    });

    const handleFollowToggle = (targetUsername: string, isFollowing: boolean) => {
        if (!currentUser) {
            toast.error("Giriş yapmalısınız");
            return;
        }
        if (isFollowing) {
            unfollowMutation.mutate(targetUsername);
        } else {
            followMutation.mutate(targetUsername);
        }
    };

    const UserList = ({ users, isLoading, emptyMessage }: { users?: SocialUser[], isLoading: boolean, emptyMessage: string }) => {
        if (isLoading) {
            return (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }

        if (!users || users.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/10 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/30 transition-all shadow-sm">
                        <Link href={`/profiles/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0 group">
                            <Avatar className="h-12 w-12 border-2 border-background group-hover:border-primary/50 transition-colors">
                                <AvatarImage src={getImageUrl(user.profileImageUrl)} />
                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="font-semibold truncate group-hover:text-primary transition-colors">
                                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                            </div>
                        </Link>

                        {currentUser && user.username !== currentUser.username && (
                            <Button
                                size="sm"
                                variant={user.isFollowing ? "secondary" : "default"}
                                className="ml-3 shrink-0 h-9 px-3 cursor-pointer"
                                onClick={() => handleFollowToggle(user.username, user.isFollowing)}
                                disabled={followMutation.isPending || unfollowMutation.isPending}
                            >
                                {user.isFollowing ? (
                                    <>
                                        <UserCheck className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Takip Ediliyor</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Takip Et</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")} className="w-full">
            <TabsList className="w-full justify-start h-auto bg-muted/50 rounded-lg mb-2 inline-flex">
                <TabsTrigger value="followers" className="px-6 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
                    Takipçiler
                </TabsTrigger>
                <TabsTrigger value="following" className="px-6 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">
                    Takip Edilenler
                </TabsTrigger>
            </TabsList>

            <TabsContent value="followers" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <UserList users={followers as SocialUser[]} isLoading={followersLoading} emptyMessage="Henüz takipçi yok." />
            </TabsContent>

            <TabsContent value="following" className="mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <UserList users={following as SocialUser[]} isLoading={followingLoading} emptyMessage="Henüz kimse takip edilmiyor." />
            </TabsContent>
        </Tabs>
    );
}