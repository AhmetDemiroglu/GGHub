"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle, UserCheck } from "lucide-react";
import { getUserDetails, banUser, unbanUser, changeUserRole } from "@/api/admin/admin.api";
import type { AdminUserDetails, BanUserRequest, ChangeRoleRequest } from "@/models/admin/admin.model";
import { queryClient } from "@core/components/base/providers";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { getImageUrl } from "@/core/lib/get-image-url";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import * as React from "react";
import { UserListsTab } from "@/core/components/admin/user-lists-tab";
import { UserReviewsTab } from "@/core/components/admin/user-reviews-tab";
import { UserCommentsTab } from "@/core/components/admin/user-comments-tab";
import { UserReportsTab } from "@/core/components/admin/user-reports-tab";

export default function UserDetailPage() {
    const params = useParams();
    const userId = Number(params.id);
    const [isBanAlertOpen, setIsBanAlertOpen] = React.useState(false);
    const [isUnbanAlertOpen, setIsUnbanAlertOpen] = React.useState(false);
    const [isRoleAlertOpen, setIsRoleAlertOpen] = React.useState(false);

    const {
        data: user,
        isLoading: isLoadingUser,
        isError: isErrorUser,
    } = useQuery<AdminUserDetails>({
        queryKey: ["adminUserDetails", userId],
        queryFn: async () => (await getUserDetails(userId)).data,
        enabled: !!userId,
    });

    const invalidateUserQueries = () => {
        queryClient.invalidateQueries({ queryKey: ["adminUserDetails", userId] });
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    };

    const { mutate: banUserMutate, isPending: isBanning } = useMutation({
        mutationFn: (variables: { userId: number; data: BanUserRequest }) => banUser(variables.userId, variables.data),
        onSuccess: () => {
            toast.success(`Kullanıcı askıya alındı.`);
            invalidateUserQueries();
        },
    });

    const { mutate: unbanUserMutate, isPending: isUnbanning } = useMutation({
        mutationFn: (userId: number) => unbanUser(userId),
        onSuccess: () => {
            toast.success(`Kullanıcı aktifleştirildi.`);
            invalidateUserQueries();
        },
    });

    const { mutate: changeRoleMutate, isPending: isChangingRole } = useMutation({
        mutationFn: (variables: { userId: number; data: ChangeRoleRequest }) => changeUserRole(variables.userId, variables.data),
        onSuccess: () => {
            toast.success(`Kullanıcı rolü güncellendi.`);
            invalidateUserQueries();
        },
    });

    const isPendingAction = isBanning || isUnbanning || isChangingRole;

    const confirmBan = () => {
        banUserMutate({
            userId: userId,
            data: { reason: "Admin tarafından banlandı." },
        });
    };
    const confirmUnban = () => {
        unbanUserMutate(userId);
    };
    const confirmRoleChange = () => {
        const newRole = user?.role === "Admin" ? "User" : "Admin";
        changeRoleMutate({ userId: userId, data: { newRole: newRole } });
    };

    if (isLoadingUser) {
        return <p>Kullanıcı bilgileri yükleniyor...</p>;
    }
    if (isErrorUser || !user) {
        return <p className="text-destructive">Kullanıcı bulunamadı veya yüklenemedi.</p>;
    }

    return (
        <div className="container flex flex-col gap-5 py-6 lg:py-8 px-6 lg:px-8">
            <div>
                <Button asChild variant="ghost" className="-ml-4">
                    <Link href="/users">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tüm Kullanıcılara Geri Dön
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                            <AvatarFallback className="text-3xl">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-3xl">{user.username}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                            <div className="mt-2 flex gap-2">
                                <Badge variant={user.role === "Admin" ? "default" : "secondary"}>{user.role}</Badge>
                                {user.isBanned ? (
                                    <Badge variant="destructive">Askıda</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-green-600">
                                        Aktif
                                    </Badge>
                                )}
                                {user.isEmailVerified && (
                                    <Badge variant="outline">
                                        <CheckCircle></CheckCircle> E-posta Onaylı
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-shrink-0 gap-2">
                        {user.isBanned ? (
                            <Button variant="outline" className="cursor-pointer" onClick={() => setIsUnbanAlertOpen(true)} disabled={isPendingAction}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Banı Kaldır
                            </Button>
                        ) : (
                            <Button variant="destructive" className="cursor-pointer" onClick={() => setIsBanAlertOpen(true)} disabled={isPendingAction}>
                                <Ban className="mr-2 h-4 w-4" />
                                Askıya Al
                            </Button>
                        )}
                        <Button variant="secondary" className="cursor-pointer" onClick={() => setIsRoleAlertOpen(true)} disabled={isPendingAction}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Rolü Değiştir
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="lists">
                <TabsList>
                    <TabsTrigger value="lists" className="cursor-pointer">
                        Listeler
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="cursor-pointer">
                        İncelemeler
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="cursor-pointer">
                        Yorumlar
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="cursor-pointer">
                        Raporlamalar
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="lists" className="mt-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kullanıcının Listeleri</CardTitle>
                            <CardDescription>Bu kullanıcının sahip olduğu tüm listeler (gizliler dahil).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserListsTab userId={userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kullanıcının İncelemeleri</CardTitle>
                            <CardDescription>Bu kullanıcının yaptığı tüm oyun incelemeleri.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserReviewsTab userId={userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="comments" className="mt-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kullanıcının Yorumları</CardTitle>
                            <CardDescription>Bu kullanıcının listelere yaptığı tüm yorumlar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserCommentsTab userId={userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="mt-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Kullanıcının Yaptığı Raporlar</CardTitle>
                            <CardDescription>Bu kullanıcının platformda oluşturduğu tüm içerik raporları.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserReportsTab userId={userId} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={isBanAlertOpen} onOpenChange={setIsBanAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu işlem, '{user.username}' kullanıcısını askıya alacaktır.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmBan} className="bg-destructive hover:bg-destructive/90">
                            Evet, Askıya Al
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isUnbanAlertOpen} onOpenChange={setIsUnbanAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>Bu işlem, '{user.username}' kullanıcısını aktifleştirecektir.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnban}>Evet, Aktifleştir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isRoleAlertOpen} onOpenChange={setIsRoleAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rolü Değiştir</AlertDialogTitle>
                        <AlertDialogDescription>
                            '{user.username}' kullanıcısının rolünü '{user.role === "Admin" ? "User" : "Admin"}' olarak değiştirmek istediğinizden emin misiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRoleChange}>Evet, Değiştir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
