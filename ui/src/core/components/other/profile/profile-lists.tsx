"use client";

import { useQuery } from "@tanstack/react-query";
import { getListsByUsername } from "@/api/list/list.api";
import { Loader2, Library } from "lucide-react";
import Link from "next/link";
import { UserListType } from "@/models/list/list.model";
import { ListCard } from "@/core/components/other/list-card";

interface ProfileListsProps {
    username: string;
}

export default function ProfileLists({ username }: ProfileListsProps) {
    const { data: lists, isLoading } = useQuery({
        queryKey: ["profile-lists", username],
        queryFn: () => getListsByUsername(username),
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!lists || lists.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <div className="bg-muted/50 p-4 rounded-full mb-4">
                    <Library className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Liste bulunamadı</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                    Bu kullanıcı henüz herkese açık bir liste oluşturmamış.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {lists.map((list) => {
                const listCardData = {
                    id: list.id,
                    name: list.name,
                    description: list.description || undefined,
                    visibility: list.visibility,
                    category: list.category,
                    averageRating: list.averageRating,
                    ratingCount: 0,
                    gameCount: list.gameCount,
                    followerCount: list.followerCount,
                    firstGameImageUrls: list.firstGameImageUrls,
                    owner: {
                        id: 0,
                        username: username,
                    }
                };

                return (
                    <div key={list.id} className="h-full">
                        <Link href={list.type === UserListType.Wishlist ? "/wishlist" : `/lists/${list.id}`} className="block h-full">
                            <ListCard list={listCardData} />
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}