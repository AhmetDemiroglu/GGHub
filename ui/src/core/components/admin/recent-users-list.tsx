"use client";

import type { AdminUserSummary } from "@/models/admin/admin.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import Link from "next/link";
import { getImageUrl } from "@/core/lib/get-image-url";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

interface RecentUsersListProps {
    users: AdminUserSummary[];
}

export const RecentUsersList = ({ users }: RecentUsersListProps) => {
    const locale = useCurrentLocale();
    const t = useI18n();

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t("admin.recentUsersTitle")}</CardTitle>
                    <CardDescription>{t("admin.recentUsersDescription")}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href={buildLocalizedPathname("/users", locale)}>{t("admin.viewAll")}</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
                <div className="flex flex-1 flex-col gap-4">
                    {users.length > 0 ? (
                        users.map((user) => (
                            <Link href={buildLocalizedPathname(`/users/${user.id}`, locale)} key={user.id} className="-m-2 flex items-center gap-3 rounded-md p-2 hover:bg-accent">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{user.username}</p>
                                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="text-center text-sm text-muted-foreground">{t("admin.noRecentUsers")}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
