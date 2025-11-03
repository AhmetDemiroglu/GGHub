"use client";

import { getMyProfile } from "@/api/profile/profile.api";
import { AuthGuard } from "@/core/components/base/auth-guard";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Skeleton } from "@/core/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Pencil, Eye, EyeOff, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";
import { ProfileEditForm } from "@/core/components/other/profile-edit-form";
import { Profile } from "@/models/profile/profile.model";
import { ProfilePhotoUploader } from "@/core/components/other/profile-photo-uploader";
import { DangerZone } from "@/core/components/other/danger-zone";
export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [isPhotoUploaderOpen, setIsPhotoUploaderOpen] = useState(false);
    const getImageUrl = (path: string | null | undefined): string | undefined => {
        if (!path) {
            return undefined;
        }
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return path;
        }
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
    });

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
                        <CardTitle>Hata</CardTitle>
                        <CardDescription>Profil bilgileri yüklenirken bir sorun oluştu.</CardDescription>
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
    const visibilityMap: { [key: number]: string } = {
        0: "Herkese Açık",
        1: "Sadece Takipçiler",
        2: "Sadece Ben",
    };

    const messageSettingMap: { [key: number]: string } = {
        0: "Herkes",
        1: "Sadece Takip Ettiklerim",
        2: "Hiç Kimse",
    };

    const ProfileReadOnlyView = ({ data }: { data: Profile }) => (
        <>
            <div className="space-y-2">
                <p>
                    <strong>İsim:</strong> {data.firstName || "Belirtilmemiş"}
                </p>
                <p>
                    <strong>Soyisim:</strong> {data.lastName || "Belirtilmemiş"}
                </p>
                <p>
                    <strong>Bio:</strong> {data.bio || "Bio eklenmemiş."}
                </p>

                {/* Doğum Tarihi */}
                <div className="flex items-center space-x-2">
                    <p>
                        <strong>Doğum Tarihi:</strong> {data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString("tr-TR") : "Belirtilmemiş"}
                    </p>
                    {data.dateOfBirth && (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>{data.isDateOfBirthPublic ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{data.isDateOfBirthPublic ? "Herkese Açık" : "Gizli"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                {/* E-posta Satırı */}
                <div className="flex items-center space-x-2">
                    <p>
                        <strong>E-posta:</strong> {data.email}
                    </p>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger>{data.isEmailPublic ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TooltipTrigger>
                            <TooltipContent>
                                <p>{data.isEmailPublic ? "Herkese Açık" : "Gizli"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Telefon Numarası Satırı */}
                {data.phoneNumber && (
                    <div className="flex items-center space-x-2">
                        <p>
                            <strong>Telefon:</strong> {data.phoneNumber}
                        </p>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>{data.isPhoneNumberPublic ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{data.isPhoneNumberPublic ? "Herkese Açık" : "Gizli"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )}
            </div>
            <p className="mt-2">
                <strong>Profil Görünürlüğü:</strong> {visibilityMap[data.profileVisibility] ?? "Bilinmiyor"}
            </p>
            <p className="mt-2">
                <strong>Kimler Mesaj Atabilir:</strong> {messageSettingMap[data.messageSetting] ?? "Bilinmiyor"}
            </p>
            <div className="flex justify-end-safe text-sm italic">
                <p className="mb-0">
                    <strong>Üyelik Tarihi:</strong> <span className="font-light">{new Date(data.createdAt).toLocaleDateString("tr-TR")}</span>
                </p>
            </div>
        </>
    );
    return (
        <AuthGuard>
            <div className="w-full h-full p-5">
                <div className="space-y-4">
                    <div>
                        <h1 className="text-3xl font-bold">Profil Yönetimi</h1>
                        <p className="text-muted-foreground mt-2">Kişisel bilgilerinizi, gizlilik ayarlarınızı ve daha fazlasını buradan yönetin.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <button onClick={() => setIsPhotoUploaderOpen(true)} className="rounded-full">
                                            <Avatar className="h-16 w-16 cursor-pointer">
                                                <AvatarImage src={getImageUrl(data?.profileImageUrl)} alt={data.username} />
                                                <AvatarFallback>{data.username.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </button>
                                        <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1 border-2 border-background cursor-pointer" onClick={() => setIsPhotoUploaderOpen(true)}>
                                            <Pencil className="h-3 w-3 text-primary-foreground" />
                                        </div>
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">{data.username}</CardTitle>
                                        <CardDescription>{data.email}</CardDescription>
                                    </div>
                                </div>
                                <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                                    {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>{isEditing ? <ProfileEditForm initialData={data} onSave={() => setIsEditing(false)} /> : <ProfileReadOnlyView data={data} />}</CardContent>
                    </Card>

                    <DangerZone />
                </div>
            </div>
            <ProfilePhotoUploader isOpen={isPhotoUploaderOpen} onClose={() => setIsPhotoUploaderOpen(false)} currentImageUrl={data.profileImageUrl} username={data.username} />
        </AuthGuard>
    );
}
