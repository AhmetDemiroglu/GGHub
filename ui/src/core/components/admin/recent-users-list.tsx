"use client";

import type { AdminUserSummary } from "@/models/admin/admin.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import Link from "next/link";

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

interface RecentUsersListProps {
    users: AdminUserSummary[];
}

export const RecentUsersList = ({ users }: RecentUsersListProps) => {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Son Kaydolan Kullanıcılar</CardTitle>
                    <CardDescription>En yeni 5 üye.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                    <Link href="/users">Tümünü Gör</Link>
                </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-1 flex-col gap-4">
                    {users.length > 0 ? (
                        users.map((user) => (
                            <Link href={`/users/${user.id}`} key={user.id} className="flex items-center gap-3 p-2 -m-2 rounded-md hover:bg-accent">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="text-sm text-center text-muted-foreground">Yeni kullanıcı bulunmamaktadır.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
