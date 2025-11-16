"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@core/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import { getBlockedUsers, unblockUser } from "@/api/social/social.api";
import { toast } from "sonner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import { getImageUrl } from "@/core/lib/get-image-url";

dayjs.extend(relativeTime);
dayjs.locale("tr");

interface BlockedUsersDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BlockedUsersDialog({ isOpen, onClose }: BlockedUsersDialogProps) {
    const queryClient = useQueryClient();

    const { data: blockedUsers, isLoading } = useQuery({
        queryKey: ["blocked-users"],
        queryFn: getBlockedUsers,
        enabled: isOpen,
    });

    const unblockMutation = useMutation({
        mutationFn: (username: string) => unblockUser(username),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
            toast.success("Engel kaldırıldı.");
        },
        onError: () => {
            toast.error("Engel kaldırılırken bir hata oluştu.");
        },
    });

    const handleUnblock = (username: string) => {
        unblockMutation.mutate(username);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Engellenen Kullanıcılar</DialogTitle>
                    <DialogDescription>Engellediğiniz kullanıcıları buradan yönetebilirsiniz</DialogDescription>
                </DialogHeader>

                <div className="max-h-96 overflow-y-auto space-y-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>
                    ) : blockedUsers && blockedUsers.length > 0 ? (
                        blockedUsers.map((user) => {                            
                            const displayName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;
                            const timeAgo = dayjs(user.blockedAt).fromNow();

                            return (
                                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-accent rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={getImageUrl(user?.profileImageUrl)} alt={user.username} />
                                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{displayName}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                            <p className="text-xs text-muted-foreground italic">{timeAgo} engellendi</p>
                                        </div>
                                    </div>

                                    <Button className="cursor-pointer" size="sm" variant="outline" onClick={() => handleUnblock(user.username)} disabled={unblockMutation.isPending}>
                                        Engeli Kaldır
                                    </Button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">Engellenmiş kullanıcı yok</div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
