"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { Search, X, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getUsers } from "@/api/admin/admin.api";
import type { AdminUserSummary } from "@/models/admin/admin.model";
import { getImageUrl } from "@/core/lib/get-image-url";
import { useCurrentLocale, useI18n } from "@/core/contexts/locale-context";
import { buildLocalizedPathname } from "@/i18n/config";

export const AdminQuickSearch = () => {
    const locale = useCurrentLocale();
    const t = useI18n();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<AdminUserSummary[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        const delayDebounce = setTimeout(() => {
            getUsers({ searchTerm: searchQuery, pageSize: 5 })
                .then((response) => setSearchResults(response.data.items))
                .catch(() => setSearchResults([]))
                .finally(() => setIsSearching(false));
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>{t("admin.quickSearchTitle")}</CardTitle>
                <CardDescription>{t("admin.quickSearchDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="h-full flex flex-1 flex-col">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t("admin.quickSearchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-9" />
                    {isSearching ? (
                        <Loader2 className="absolute right-1 top-1 h-7 w-7 animate-spin p-1.5" />
                    ) : searchQuery ? (
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setSearchQuery("")}>
                            <X className="h-3 w-3" />
                        </Button>
                    ) : null}
                </div>

                {searchResults.length > 0 ? (
                    <div className="mt-4 max-h-60 overflow-y-auto rounded-md border">
                        <div className="divide-y">
                            {searchResults.map((user) => (
                                <Link href={buildLocalizedPathname(`/users/${user.id}`, locale)} key={user.id} className="flex items-center gap-3 p-3 hover:bg-accent">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={user.username} />
                                        <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{user.username}</p>
                                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ) : null}

                {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">{t("admin.noUsersFound")}</div> : null}
            </CardContent>
        </Card>
    );
};
