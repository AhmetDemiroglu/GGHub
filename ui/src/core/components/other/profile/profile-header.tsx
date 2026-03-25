"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PublicProfile } from "@/models/profile/profile.model";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { Calendar, Mail, Phone, UserPlus, UserMinus, Settings, MessageSquareMore, MessageSquareLock, Ban, ShieldOff, Flag } from "lucide-react";
import { ReportDialog } from "@core/components/base/report-dialog";
import { followUser, unfollowUser, blockUser, unblockUser } from "@/api/social/social.api";
import { toast } from "sonner";
import Image from "next/image";
import gameBanner from "@/core/assets/games.jpg";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { FollowersModal } from "./followers-modal";
import { MessageDialog } from "@core/components/other/message-dialog";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@core/components/ui/tooltip";
import { BlockedUsersDialog } from "@core/components/other/blocked-users-dialog";
import { useAuth } from "@core/hooks/use-auth";
import { getImageUrl } from "@/core/lib/get-image-url";
import { getUserGamificationStats } from "@/api/gamification/gamification.api";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

interface ProfileHeaderProps {
    profile: PublicProfile;
    isOwnProfile?: boolean;
}

export default function ProfileHeader({ profile, isOwnProfile = false }: ProfileHeaderProps) {
    const t = useI18n();
    const locale = useCurrentLocale();
    dayjs.locale(locale === "tr" ? "tr" : "en");

    const { user } = useAuth();
    const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
    const [isBlocked, setIsBlocked] = useState(profile.isBlockedByMe || false);
    const [blockedUsersDialogOpen, setBlockedUsersDialogOpen] = useState(false);
    const [followerCount, setFollowerCount] = useState(profile.followerCount || 0);
    const queryClient = useQueryClient();
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const avatarSrc = getImageUrl(profile.profileImageUrl);

    const { data: stats } = useQuery({
        queryKey: ["gamification", profile.id],
        queryFn: () => getUserGamificationStats(profile.id),
        enabled: !!profile.id,
    });

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
            toast.success(t("profile.header.followSuccess"));
        },
        onError: () => {
            toast.error(t("profile.header.followError"));
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: () => unfollowUser(profile.username),
        onSuccess: () => {
            setIsFollowing(false);
            setFollowerCount((prev) => prev - 1);
            queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
            toast.success(t("profile.header.unfollowSuccess"));
        },
        onError: () => {
            toast.error(t("profile.header.unfollowError"));
        },
    });

    const handleFollow = () => {
        if (!user) {
            toast.error(t("profile.header.loginRequiredFollow"));
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
            toast.success(t("profile.header.blockSuccess"));
        },
        onError: () => {
            toast.error(t("profile.header.blockError"));
        },
    });

    const unblockMutation = useMutation({
        mutationFn: () => unblockUser(profile.username),
        onSuccess: () => {
            setIsBlocked(false);
            queryClient.invalidateQueries({ queryKey: ["profile", profile.username] });
            toast.success(t("profile.header.unblockSuccess"));
        },
        onError: () => {
            toast.error(t("profile.header.unblockError"));
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
                    <Image src={gameBanner} alt={t("profile.header.bannerAlt")} fill className="object-cover object-[center_15%] sm:object-[center_25%] md:object-[center_35%]" priority />
                    <div className="absolute inset-0 bg-background/70" />
                </div>

                <div className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start -mt-20 md:-mt-24">
                        <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-card shadow-lg">
                            <AvatarImage src={avatarSrc} alt={t("profile.header.profileImageAlt", { name: displayName })} />
                            <AvatarFallback className="text-5xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex gap-2 pt-4 sm:pt-20 md:pt-24">
                            {profile.isBlockedByMe && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={handleBlock}
                                                variant="outline"
                                                size="sm"
                                                className="cursor-pointer"
                                                disabled={blockMutation.isPending || unblockMutation.isPending}
                                                aria-label={t("profile.header.unblockTooltip")}
                                            >
                                                <ShieldOff className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t("profile.header.unblockTooltip")}</p>
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
                                <p className="text-sm text-destructive font-medium">{t("profile.header.blockedByYouTitle")}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t("profile.header.blockedByYouDescription")}</p>
                            </div>
                        )}

                        {profile.isBlockingMe && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                                <p className="text-sm text-destructive font-medium">{t("profile.header.blockedByThemTitle")}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t("profile.header.blockedByThemDescription")}</p>
                            </div>
                        )}
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{t("profile.header.joinedAt", { appName: t("common.appName"), date: dayjs(profile.createdAt).format("MMMM YYYY") })}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full rounded-lg overflow-hidden bg-card text-card-foreground shadow-md">
            <div className="h-48 md:h-56 w-full relative">
                <Image src={gameBanner} alt={t("profile.header.bannerAlt")} fill className="object-cover object-[center_15%] sm:object-[center_25%] md:object-[center_35%]" priority />
                <div className="absolute inset-0 bg-background/70" />
            </div>
            <div className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start -mt-20 md:-mt-24">
                    <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-card shadow-lg">
                        <AvatarImage src={avatarSrc} alt={t("profile.header.profileImageAlt", { name: displayName })} />
                        <AvatarFallback className="text-5xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex gap-2 pt-4 sm:pt-20 md:pt-24">
                        {isOwnProfile ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 cursor-pointer" aria-label={t("profile.header.settings")}>
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href={buildLocalizedPathname("/profile", locale)} className="cursor-pointer">
                                            {t("profile.header.editProfile")}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <div className="cursor-pointer" onClick={() => setBlockedUsersDialogOpen(true)}>
                                            {t("profile.header.viewBlockedUsers")}
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
                                            {t("profile.header.unfollow")}
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4" />
                                            {t("profile.header.follow")}
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => {
                                        if (!user) {
                                            toast.error(t("profile.header.loginRequiredMessage"));
                                            return;
                                        }
                                        setMessageDialogOpen(true);
                                    }}
                                    disabled={!user}
                                >
                                    {canSendMessage() ? (
                                        <>
                                            <MessageSquareMore className="h-4 w-4" />
                                            {t("profile.header.messageOpen")}
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquareLock className="h-4 w-4" />
                                            {t("profile.header.messageClosed")}
                                        </>
                                    )}
                                </Button>

                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={() => {
                                                    if (!user) {
                                                        toast.error(t("profile.header.loginRequiredBlock"));
                                                        return;
                                                    }
                                                    handleBlock();
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="cursor-pointer"
                                                disabled={blockMutation.isPending || unblockMutation.isPending || !user}
                                                aria-label={isBlocked ? t("profile.header.unblockTooltip") : t("profile.header.blockTooltip")}
                                            >
                                                {isBlocked ? <ShieldOff className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isBlocked ? t("profile.header.unblockTooltip") : t("profile.header.blockTooltip")}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {user && (
                                    <Button
                                        variant="outline"
                                        className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setIsReportDialogOpen(true)}
                                        title={t("profile.header.reportButton")}
                                        aria-label={t("profile.header.reportButton")}
                                    >
                                        <Flag className="h-4 w-4" />
                                        <span className="sm:inline ml-1">{t("profile.header.reportButton")}</span>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold">{displayName}</h1>
                            {stats && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative h-8 w-8 cursor-help hover:scale-110 transition-transform">
                                                <Image
                                                    src={`/assets/badges/level_${stats.currentLevel}.ico`}
                                                    alt={t("profile.header.levelImageAlt", { level: stats.currentLevel })}
                                                    fill
                                                    sizes="32px"
                                                    className="object-contain"
                                                />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t("profile.header.levelTooltip", { levelName: stats.levelName, levelShort: t("home.levelShort"), level: stats.currentLevel })}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <p className="text-muted-foreground">@{profile.username}</p>
                    </div>

                    {profile.status && (
                        <div className="flex items-center gap-2 pt-1">
                            <Badge variant="secondary" className="text-xs">
                                {t("profile.header.statusBadge")}
                            </Badge>
                            <p className="text-sm text-muted-foreground">{profile.status}</p>
                        </div>
                    )}

                    {profile.bio && <p className="text-sm text-foreground/90 pt-2 max-w-2xl leading-relaxed">{profile.bio}</p>}
                </div>

                <div className="mt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    {(followerCount !== undefined || profile.followingCount !== undefined) && (
                        <div className="flex gap-4 text-sm pb-0">
                            <div className="cursor-pointer hover:underline group" onClick={() => { setDefaultModalTab("followers"); setFollowersModalOpen(true); }}>
                                <span className="font-bold group-hover:text-primary transition-colors">{followerCount}</span>
                                <span className="text-muted-foreground ml-1">{t("profile.header.followersLabel")}</span>
                            </div>
                            <div className="cursor-pointer hover:underline group" onClick={() => { setDefaultModalTab("following"); setFollowersModalOpen(true); }}>
                                <span className="font-bold group-hover:text-primary transition-colors">{profile.followingCount ?? 0}</span>
                                <span className="text-muted-foreground ml-1">{t("profile.header.followingLabel")}</span>
                            </div>
                        </div>
                    )}

                    {isOwnProfile && stats && (
                        <div className="w-full sm:w-60">
                            <div className="flex justify-between w-full text-[10px] font-medium mb-1.5 px-0.5">
                                <span className="text-primary">{t("home.levelShort")} {stats.currentLevel}</span>
                                <span className="text-muted-foreground">
                                    {stats.currentXp} / {stats.nextLevelXp} XP
                                </span>
                            </div>

                            <div className="h-2.5 w-full bg-secondary/50 rounded-full overflow-hidden ring-1 ring-white/5">
                                <div
                                    className="h-full bg-linear-to-r from-violet-600 via-purple-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all duration-500 ease-out"
                                    style={{ width: `${Math.max(stats.progressPercentage, 1)}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{t("profile.header.remainingXp", { remaining: 100 - stats.progressPercentage })}</span>
                        </div>
                    )}
                </div>

                <Separator className="my-4" />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{t("profile.header.joinedAt", { appName: t("common.appName"), date: dayjs(profile.createdAt).format("MMMM YYYY") })}</span>
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
                        <Badge variant="secondary" className="shrink-0">
                            {t("profile.header.followingBadge")}
                        </Badge>
                    )}
                </div>
            </div>
            <FollowersModal isOpen={followersModalOpen} onClose={() => setFollowersModalOpen(false)} username={profile.username} defaultTab={defaultModalTab} />

            {!isOwnProfile && canSendMessage() && (
                <MessageDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen} recipientUsername={profile.username} recipientProfileImageUrl={profile.profileImageUrl} />
            )}

            {isOwnProfile && <BlockedUsersDialog isOpen={blockedUsersDialogOpen} onClose={() => setBlockedUsersDialogOpen(false)} />}
            {!isOwnProfile && user && (
                <ReportDialog isOpen={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} entityType="User" entityId={profile.id} />
            )}
        </div>
    );
}
