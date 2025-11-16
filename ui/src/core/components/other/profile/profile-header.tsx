"use client";

import { PublicProfile } from "@/models/profile/profile.model";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { Calendar, Mail, Phone, UserPlus, UserMinus, Settings, MessageSquareMore, MessageSquareLock, Ban, ShieldOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followUser, unfollowUser, blockUser, unblockUser } from "@/api/social/social.api";
import { toast } from "sonner";
import Image from "next/image";
import gameBanner from "@/core/assets/games 7.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { FollowersModal } from "./followers-modal";
import { MessageDialog } from "@core/components/other/message-dialog";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@core/components/ui/tooltip";
import { BlockedUsersDialog } from "@core/components/other/blocked-users-dialog";
import { useAuth } from "@core/hooks/use-auth";
import { getImageUrl } from "@/core/lib/get-image-url";

dayjs.locale("tr");

interface ProfileHeaderProps {
    profile: PublicProfile;
    isOwnProfile?: boolean;
}

export default function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
    const [isBlocked, setIsBlocked] = useState(profile.isBlockedByMe || false);
    const [blockedUsersDialogOpen, setBlockedUsersDialogOpen] = useState(false);
    const [followerCount, setFollowerCount] = useState(profile.followerCount || 0);
    const queryClient = useQueryClient();
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);

    const avatarSrc = getImageUrl(profile.profileImageUrl);

    useEffect(() => {
        setIsFollowing(profile.isFollowing || false);
        setFollowerCount(profile.followerCount || 0);
    }, [profile.isFollowing, profile.followerCount, profile]);

    useEffect(() => {
        setIsBlocked(profile.isBlockedByMe || false);
    }, [profile.isBlockedByMe, profile]);

    const followMutation = useMutation({
        mutationFn: () => followUser(profile.username),
        onSuccess: () => {
            setIsFollowing(true);
            setFollowerCount((prev) => prev + 1);
            queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
            toast.success("Kullanıcı takip edildi!");
        },
        onError: () => {
            toast.error("Takip edilirken bir hata oluştu.");
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: () => unfollowUser(profile.username),
        onSuccess: () => {
            setIsFollowing(false);
            setFollowerCount((prev) => prev - 1);
            queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
            toast.success("Takip bırakıldı.");
        },
        onError: () => {
            toast.error("Takip bırakılırken bir hata oluştu.");
        },
    });

    const handleFollow = () => {
        if (!user) {
            toast.error("Takip etmek için giriş yapmalısınız.");
            return;
        }
        if (isFollowing) {
            unfollowMutation.mutate();
        } else {
            followMutation.mutate();
        }
    };

    const blockMutation = useMutation({
        mutationFn: () => blockUser(profile.username),
        onSuccess: () => {
            setIsBlocked(true);
            queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
            toast.success("Kullanıcı engellendi.");
        },
        onError: () => {
            toast.error("Engellenirken bir hata oluştu.");
        },
    });

    const unblockMutation = useMutation({
        mutationFn: () => unblockUser(profile.username),
        onSuccess: () => {
            setIsBlocked(false);
            queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
            toast.success("Engel kaldırıldı.");
        },
        onError: () => {
            toast.error("Engel kaldırılırken bir hata oluştu.");
        },
    });

    const handleBlock = () => {
        if (isBlocked) {
            unblockMutation.mutate();
        } else {
            blockMutation.mutate();
        }
    };

    const canSendMessage = () => {
        if (profile.messageSetting === 2) return false;
        if (profile.messageSetting === 1 && !profile.isFollowedBy) return false;
        return true;
    };

    const displayName = profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.username;

    const [followersModalOpen, setFollowersModalOpen] = useState(false);
    const [defaultModalTab, setDefaultModalTab] = useState<"followers" | "following">("followers");

    const isBlockRelationship = profile.isBlockedByMe || profile.isBlockingMe;

    if (isBlockRelationship && !isOwnProfile) {
        return (
            <div className="w-full rounded-lg overflow-hidden bg-card text-card-foreground shadow-md">
                <div className="h-48 md:h-56 w-full relative">
                    <Image src={gameBanner} alt="GGHub Banner" fill className="object-cover object-[center_15%] sm:object-[center_25%] md:object-[center_35%]" priority />
                    <div className="absolute inset-0 bg-background/70" />
                </div>

                <div className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start -mt-20 md:-mt-24">
                        <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-card shadow-lg">
                            <AvatarImage src={avatarSrc} alt={`${displayName} profil resmi`} />
                            <AvatarFallback className="text-5xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex gap-2 pt-4 sm:pt-20 md:pt-24">
                            {profile.isBlockedByMe && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={handleBlock} variant="outline" size="sm" className="cursor-pointer" disabled={blockMutation.isPending || unblockMutation.isPending}>
                                                <ShieldOff className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Engeli Kaldır</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <h1 className="text-2xl font-bold">{displayName}</h1>
                            <p className="text-muted-foreground">@{profile.username}</p>
                        </div>

                        {profile.isBlockedByMe && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                                <p className="text-sm text-destructive font-medium">Bu kullanıcıyı engellediniz</p>
                                <p className="text-xs text-muted-foreground mt-1">Bu kullanıcının profilini görüntüleyemezsiniz ve kullanıcı sizinle iletişim kuramaz.</p>
                            </div>
                        )}

                        {profile.isBlockingMe && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                                <p className="text-sm text-destructive font-medium">Bu kullanıcı sizi engelledi</p>
                                <p className="text-xs text-muted-foreground mt-1">Bu kullanıcının profilini görüntüleyemezsiniz.</p>
                            </div>
                        )}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>GGHub&apos;a {dayjs(profile.createdAt).format("MMMM YYYY")} tarihinde katıldı</span>
                    </div>
                </div>
            </div>
        );
    }

    // Normal profil görünümü
    return (
        <div className="w-full rounded-lg overflow-hidden bg-card text-card-foreground shadow-md">
            <div className="h-48 md:h-56 w-full relative">
                <Image src={gameBanner} alt="GGHub Banner" fill className="object-cover object-[center_15%] sm:object-[center_25%] md:object-[center_35%]" priority />
                <div className="absolute inset-0 bg-background/70" />
            </div>
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start -mt-20 md:-mt-24">
                    <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-card shadow-lg">
                        <AvatarImage src={avatarSrc} alt={`${displayName} profil resmi`} />
                        <AvatarFallback className="text-5xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex gap-2 pt-4 sm:pt-20 md:pt-24">
                        {isOwnProfile ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="cursor-pointer">
                                            Profili Düzenle
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <div className="cursor-pointer" onClick={() => setBlockedUsersDialogOpen(true)}>
                                            Engellenenleri Görüntüle
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Button
                                    onClick={handleFollow}
                                    variant={isFollowing ? "outline" : "default"}
                                    size="sm"
                                    className="gap-2 cursor-pointer"
                                    disabled={followMutation.isPending || unfollowMutation.isPending || !user}
                                >
                                    {isFollowing ? (
                                        <>
                                            <UserMinus className="h-4 w-4" />
                                            Takibi Bırak
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4" />
                                            Takip Et
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => {
                                        if (!user) {
                                            toast.error("Mesaj göndermek için giriş yapmalısınız.");
                                            return;
                                        }
                                        setMessageDialogOpen(true);
                                    }}
                                    disabled={!user}
                                >
                                    {canSendMessage() ? (
                                        <>
                                            <MessageSquareMore className="h-4 w-4" />
                                            Mesaj Gönder
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquareLock className="h-4 w-4" />
                                            Mesaj Kapalı
                                        </>
                                    )}
                                </Button>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={() => {
                                                    if (!user) {
                                                        toast.error("Bu işlem için giriş yapmalısınız.");
                                                        return;
                                                    }
                                                    handleBlock();
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="cursor-pointer"
                                                disabled={blockMutation.isPending || unblockMutation.isPending || !user}
                                            >
                                                {isBlocked ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isBlocked ? "Engeli Kaldır" : "Bu kullanıcıyı engelle"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div>
                        <h1 className="text-2xl font-bold">{displayName}</h1>
                        <p className="text-muted-foreground">@{profile.username}</p>
                    </div>

                    {profile.status && (
                        <div className="flex items-center gap-2 pt-1">
                            <Badge variant="secondary" className="text-xs">
                                Durum
                            </Badge>
                            <p className="text-sm text-muted-foreground">{profile.status}</p>
                        </div>
                    )}

                    {profile.bio && <p className="text-sm text-foreground/90 pt-2">{profile.bio}</p>}
                </div>

                {(followerCount !== undefined && followerCount !== null) || (profile.followingCount !== undefined && profile.followingCount !== null) ? (
                    <div className="flex gap-4 text-sm mt-4">
                        <div
                            className="cursor-pointer hover:underline"
                            onClick={() => {
                                setDefaultModalTab("followers");
                                setFollowersModalOpen(true);
                            }}
                        >
                            <span className="font-bold">{followerCount}</span>
                            <span className="text-muted-foreground"> Takipçi</span>
                        </div>
                        <div
                            className="cursor-pointer hover:underline"
                            onClick={() => {
                                setDefaultModalTab("following");
                                setFollowersModalOpen(true);
                            }}
                        >
                            <span className="font-bold">{profile.followingCount ?? 0}</span>
                            <span className="text-muted-foreground"> Takip</span>
                        </div>
                    </div>
                ) : null}

                <Separator className="my-4" />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>GGHub'a {dayjs(profile.createdAt).format("MMMM YYYY")} tarihinde katıldı</span>
                        </div>

                        {profile.isDateOfBirthPublic && profile.dateOfBirth && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{dayjs(profile.dateOfBirth).format("D MMMM YYYY")}</span>
                            </div>
                        )}

                        {profile.isEmailPublic && profile.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{profile.email}</span>
                            </div>
                        )}

                        {profile.isPhoneNumberPublic && profile.phoneNumber && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{profile.phoneNumber}</span>
                            </div>
                        )}
                    </div>

                    {isFollowing && (
                        <Badge variant="secondary" className="flex-shrink-0">
                            Takip Ediliyor
                        </Badge>
                    )}
                </div>
            </div>
            <FollowersModal isOpen={followersModalOpen} onClose={() => setFollowersModalOpen(false)} username={profile.username} defaultTab={defaultModalTab} />

            {!isOwnProfile && canSendMessage() && (
                <MessageDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen} recipientUsername={profile.username} recipientProfileImageUrl={profile.profileImageUrl} />
            )}

            {isOwnProfile && <BlockedUsersDialog isOpen={blockedUsersDialogOpen} onClose={() => setBlockedUsersDialogOpen(false)} />}
        </div>
    );
}
