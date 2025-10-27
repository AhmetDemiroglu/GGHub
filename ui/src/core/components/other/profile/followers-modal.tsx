"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { getFollowers, getFollowing, followUser, unfollowUser } from "@/api/social/social.api";
import { useRouter } from "next/navigation";
import { Button } from "@/core/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@core/hooks/use-auth";
import Link from "next/link";

interface User {
    id: number;
    username: string;
    profileImageUrl?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    isFollowing: boolean;
    isProfileAccessible: boolean;
}
interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    defaultTab?: "followers" | "following";
}

export function FollowersModal({ isOpen, onClose, username, defaultTab = "followers" }: FollowersModalProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(defaultTab);
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    const { user: currentUser } = useAuth();

    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab, isOpen]);

    const { data: followers, isLoading: followersLoading } = useQuery({
        queryKey: ["followers", username],
        queryFn: () => getFollowers(username),
        enabled: isOpen && activeTab === "followers",
    });

    const { data: following, isLoading: followingLoading } = useQuery({
        queryKey: ["following", username],
        queryFn: () => getFollowing(username),
        enabled: isOpen && activeTab === "following",
    });
    const handleFollowToggle = (targetUsername: string, currentlyFollowing: boolean) => {
        if (currentlyFollowing) {
            unfollowUser(targetUsername)
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["followers", username] });
                    queryClient.invalidateQueries({ queryKey: ["following", username] });
                    toast.success("Takip bırakıldı");
                })
                .catch(() => toast.error("Bir hata oluştu"));
        } else {
            followUser(targetUsername)
                .then(() => {
                    queryClient.invalidateQueries({ queryKey: ["followers", username] });
                    queryClient.invalidateQueries({ queryKey: ["following", username] });
                    toast.success("Takip edildi");
                })
                .catch(() => toast.error("Bir hata oluştu"));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>@{username}</DialogTitle>
                    <DialogDescription>Takipçiler ve takip edilenler</DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "followers" | "following")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="followers" className="cursor-pointer">
                            Takipçiler
                        </TabsTrigger>
                        <TabsTrigger value="following" className="cursor-pointer">
                            Takip Edilenler
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="followers" className="max-h-96 overflow-y-auto space-y-2">
                        {followersLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                        ) : followers && followers.length > 0 ? (
                            followers.map((user: User) => (
                                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg">
                                    {user.isProfileAccessible ? (
                                        <Link href={`/profiles/${user.username}`} className="flex items-center gap-3 cursor-pointer" onClick={onClose}>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.profileImageUrl ? `${API_BASE}${user.profileImageUrl}` : undefined} alt={user.username} />
                                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p>
                                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.profileImageUrl ? `${API_BASE}${user.profileImageUrl}` : undefined} alt={user.username} />
                                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p>
                                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                                                <p className="text-xs text-indigo-600 mt-0.5">Gizli Profil</p>
                                            </div>
                                        </div>
                                    )}

                                    {currentUser && user.username !== currentUser.username && user.isProfileAccessible && (
                                        <Button
                                            size="sm"
                                            className="cursor-pointer"
                                            variant={user.isFollowing ? "outline" : "default"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFollowToggle(user.username, user.isFollowing);
                                            }}
                                        >
                                            {user.isFollowing ? "Takip Ediliyor" : "Takip Et"}
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">Henüz takipçi yok</div>
                        )}
                    </TabsContent>

                    <TabsContent value="following" className="max-h-96 overflow-y-auto space-y-2">
                        {followingLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                        ) : following && following.length > 0 ? (
                            following.map((user: User) => (
                                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg">
                                    {user.isProfileAccessible ? (
                                        <Link href={`/profiles/${user.username}`} className="flex items-center gap-3 cursor-pointer" onClick={onClose}>
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.profileImageUrl ? `${API_BASE}${user.profileImageUrl}` : undefined} alt={user.username} />
                                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p>
                                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.profileImageUrl ? `${API_BASE}${user.profileImageUrl}` : undefined} alt={user.username} />
                                                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p>
                                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                                                <p className="text-xs text-indigo-600 mt-0.5">Gizli Profil</p>
                                            </div>
                                        </div>
                                    )}

                                    {currentUser && user.username !== currentUser.username && user.isProfileAccessible && (
                                        <Button
                                            size="sm"
                                            variant={user.isFollowing ? "outline" : "default"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFollowToggle(user.username, user.isFollowing);
                                            }}
                                        >
                                            {user.isFollowing ? "Takip Ediliyor" : "Takip Et"}
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">Henüz kimse takip edilmiyor</div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
