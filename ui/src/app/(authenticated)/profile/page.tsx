"use client";

import { getMyProfile } from "@/api/profile/profile.api";
import { AuthGuard } from "@/core/components/base/auth-guard";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useMemo, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Pencil, Eye, EyeOff, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";
import { ProfileEditForm } from "@/core/components/other/profile-edit-form";
import { Profile } from "@/models/profile/profile.model";
import { ProfilePhotoUploader } from "@/core/components/other/profile-photo-uploader";
import { DangerZone } from "@/core/components/other/danger-zone";
import { ChangePasswordCard } from "@/core/components/other/change-password-card";
import { getImageUrl } from "@/core/lib/get-image-url";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";

export default function ProfilePage() {
    const t = useI18n();
    const locale = useCurrentLocale();
    const [isEditing, setIsEditing] = useState(false);
    const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
    });

    const visibilityMap = useMemo<Record<number, string>>(
        () => ({
            0: t("profilePage.public"),
            1: t("profilePage.followersOnly"),
            2: t("profilePage.onlyMe"),
        }),
        [t]
    );

    const messageSettingMap = useMemo<Record<number, string>>(
        () => ({
            0: t("profilePage.everyone"),
            1: t("profilePage.followingOnly"),
            2: t("profilePage.nobody"),
        }),
        [t]
    );

    if (isLoading) {
        return (
            <AuthGuard>
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </AuthGuard>
        );
    }

    if (isError) {
        return (
            <AuthGuard>
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>{t("profilePage.errorTitle")}</CardTitle>
                        <CardDescription>{t("profilePage.errorDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-500">{error.message}</p>
                    </CardContent>
                </Card>
            </AuthGuard>
        );
    }

    if (!data) {
        return null;
    }

    const formatDate = (value: string | Date) => new Date(value).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US");

    const visibilityText = (isPublic: boolean) => (isPublic ? t("profilePage.public") : t("profilePage.hidden"));

    const ProfileReadOnlyView = ({ data }: { data: Profile }) => (
        <>
            <div className="space-y-2">
                <p>
                    <strong>{t("profilePage.firstName")}:</strong> {data.firstName || t("profilePage.unspecified")}
                </p>
                <p>
                    <strong>{t("profilePage.lastName")}:</strong> {data.lastName || t("profilePage.unspecified")}
                </p>
                <p>
                    <strong>{t("profilePage.bio")}:</strong> {data.bio || t("profilePage.bioMissing")}
                </p>

                <div className="flex items-center space-x-2">
                    <p>
                        <strong>{t("profilePage.dateOfBirth")}:</strong> {data.dateOfBirth ? formatDate(data.dateOfBirth) : t("profilePage.unspecified")}
                    </p>
                    {data.dateOfBirth && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>{data.isDateOfBirthPublic ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{visibilityText(data.isDateOfBirthPublic)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <p>
                        <strong>{t("profilePage.email")}:</strong> {data.email}
                    </p>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger>{data.isEmailPublic ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TooltipTrigger>
                            <TooltipContent>
                                <p>{visibilityText(data.isEmailPublic)}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {data.phoneNumber && (
                    <div className="flex items-center space-x-2">
                        <p>
                            <strong>{t("profilePage.phone")}:</strong> {data.phoneNumber}
                        </p>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>{data.isPhoneNumberPublic ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{visibilityText(data.isPhoneNumberPublic)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
            <p className="mt-2">
                <strong>{t("profilePage.profileVisibility")}:</strong> {visibilityMap[data.profileVisibility] ?? t("profilePage.unknown")}
            </p>
            <p className="mt-2">
                <strong>{t("profilePage.messageSetting")}:</strong> {messageSettingMap[data.messageSetting] ?? t("profilePage.unknown")}
            </p>
            <div className="flex justify-end-safe text-sm italic">
                <p className="mb-0">
                    <strong>{t("profilePage.membershipDate")}:</strong> <span className="font-light">{formatDate(data.createdAt)}</span>
                </p>
            </div>
        </>
    );

    return (
        <AuthGuard>
            <div className="w-full h-full p-5 md:p-5 max-w-4xl mx-auto">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold">{t("profilePage.title")}</h1>
                        <p className="text-muted-foreground mt-2">{t("profilePage.description")}</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center space-x-3 md:space-x-4">
                                    <div className="relative shrink-0">
                                        <button onClick={() => setIsPhotoUploaderOpen(true)} className="rounded-full">
                                            <Avatar className="h-14 w-14 md:h-16 md:w-16 cursor-pointer">
                                                <AvatarImage src={getImageUrl(data.profileImageUrl)} alt={data.username} />
                                                <AvatarFallback>{data.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                        <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1 border-2 border-background cursor-pointer" onClick={() => setIsPhotoUploaderOpen(true)}>
                                            <Pencil className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary-foreground" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="text-xl md:text-2xl truncate">{data.username}</CardTitle>
                                        <CardDescription className="text-xs md:text-sm truncate">{data.email}</CardDescription>
                                    </div>
                                </div>
                                <Button className="cursor-pointer self-end md:self-auto" variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>{isEditing ? <ProfileEditForm initialData={data} onSave={() => setIsEditing(false)} /> : <ProfileReadOnlyView data={data} />}</CardContent>
                    </Card>

                    <ChangePasswordCard />
                    <DangerZone />
                </div>
            </div>
            <ProfilePhotoUploader isOpen={isPhotoUploaderOpen} onClose={() => setIsPhotoUploaderOpen(false)} currentImageUrl={data.profileImageUrl} username={data.username} />
        </AuthGuard>
    );
}
