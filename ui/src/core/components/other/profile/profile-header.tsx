"use client";

import { PublicProfile } from "@/models/profile/profile.model";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { Calendar, Mail, Phone, UserPlus, UserMinus } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followUser, unfollowUser } from "@/api/social/social.api";
import { toast } from "sonner";
import Image from "next/image";
import gameBanner from "@/core/assets/games.png";

dayjs.locale("tr");

interface ProfileHeaderProps {
    profile: PublicProfile;
}

const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    return `${API_BASE}${path}`;
};

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
    const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
    const [followerCount, setFollowerCount] = useState(profile.followerCount || 0);
    const queryClient = useQueryClient();

    const avatarSrc = getImageUrl(profile.profileImageUrl);

    useEffect(() => {
        setIsFollowing(profile.isFollowing || false);
        setFollowerCount(profile.followerCount || 0);
    }, [profile.isFollowing, profile.followerCount, profile]);

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
        if (isFollowing) {
            unfollowMutation.mutate();
        } else {
            followMutation.mutate();
        }
    };

    const displayName = profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : profile.username;

    return (
        <div className="w-full rounded-lg overflow-hidden bg-card text-card-foreground shadow-md">
            <div className="h-48 md:h-64 w-full relative">
                <Image src={gameBanner} alt="GGHub Banner" layout="fill" objectFit="cover" priority />
                <div className="absolute inset-0 bg-background/70" />
            </div>
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start -mt-20 md:-mt-24">
                    <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-card shadow-lg">
                        <AvatarImage src={avatarSrc} alt={`${displayName} profil resmi`} />
                        <AvatarFallback className="text-5xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex gap-2 pt-4 sm:pt-20 md:pt-24">
                        <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"} size="sm" className="gap-2" disabled={followMutation.isPending || unfollowMutation.isPending}>
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
                        <Button variant="outline" size="sm">
                            Mesaj Gönder
                        </Button>
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

                {(profile.followerCount !== undefined || profile.followingCount !== undefined) && (
                    <div className="flex gap-4 text-sm mt-4">
                        <div>
                            <span className="font-bold">{followerCount}</span>
                            <span className="text-muted-foreground"> Takipçi</span>
                        </div>
                        {profile.followingCount !== undefined && (
                            <div>
                                <span className="font-bold">{profile.followingCount}</span>
                                <span className="text-muted-foreground"> Takip</span>
                            </div>
                        )}
                    </div>
                )}

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
        </div>
    );
}
