"use client";

import type { TopUser } from "@/models/analytics/analytics.model";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@core/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@core/components/ui/avatar";
import { Users } from "lucide-react";
import Link from "next/link";
import { getImageUrl } from "@/core/lib/get-image-url";

interface TopUsersCardProps {
    users: TopUser[];
}

export const TopUsersCard = ({ users }: TopUsersCardProps) => {
    return (
        <Card className="h-full flex flex-col">
            {/* <-- Stretch Kuralı */}
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    En Çok Takip Edilen Kullanıcılar
                </CardTitle>
                <CardDescription>Platformun en popüler 5 üyesi.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {/* <-- Stretch Kuralı */}
                <div className="flex flex-1 flex-col gap-4">
                    {users.length > 0 ? (
                        users.map((user) => (
                            <Link href={`/users/${user.userId}`} key={user.userId} className="flex items-center gap-3 p-2 -m-2 rounded-md hover:bg-accent">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                                    <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.followerCount} Takipçi</p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <p className="flex-1 flex items-center justify-center text-sm text-center text-muted-foreground">Veri bulunamadı.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
