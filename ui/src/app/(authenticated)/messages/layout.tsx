"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversations } from "@/api/messages/messages.api";
import { ConversationDto } from "@/models/messages/message.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Badge } from "@core/components/ui/badge";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { useRouter, usePathname } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import { MessageSquare, ChevronRight, ChevronLeft, Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { searchMessageableUsers } from "@/api/search/search.api";
import { SearchResult } from "@/models/search/search.model";
import { useDebounce } from "@core/hooks/use-debounce";

dayjs.extend(relativeTime);
dayjs.locale("tr");

const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    return `${API_BASE}${path}`;
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    // Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 500);

    const { data: conversations, isLoading } = useQuery<ConversationDto[]>({
        queryKey: ["conversations"],
        queryFn: getConversations,
        refetchInterval: 10000,
    });

    // Search effect
    useEffect(() => {
        if (debouncedSearch.length >= 2) {
            setIsSearching(true);
            searchMessageableUsers(debouncedSearch)
                .then((results) => {
                    setSearchResults(results);
                })
                .catch(() => {
                    setSearchResults([]);
                })
                .finally(() => {
                    setIsSearching(false);
                });
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearch]);

    const handleConversationClick = (username: string) => {
        router.push(`/messages/${username}`);
    };

    const isActive = (username: string) => {
        return pathname === `/messages/${username}`;
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden -m-4 md:-m-6 2xl:-m-10">
            {/* Sol Sidebar - Conversations */}
            <div className={`${sidebarExpanded ? "w-80" : "w-20"} border-r bg-card flex flex-col transition-all duration-300`}>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                    {sidebarExpanded && <h1 className="text-xl font-bold">Mesajlar</h1>}
                    <Button variant="ghost" size="icon" onClick={() => setSidebarExpanded(!sidebarExpanded)} className={!sidebarExpanded ? "mx-auto" : ""}>
                        {sidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <p className="text-sm text-muted-foreground">{sidebarExpanded ? "Yükleniyor..." : "..."}</p>
                        </div>
                    ) : conversations && conversations.length > 0 ? (
                        <div className="divide-y">
                            {conversations.map((conversation) => {
                                const avatarSrc = getImageUrl(conversation.partnerProfileImageUrl);
                                const timeAgo = dayjs(conversation.lastMessageSentAt).fromNow();
                                const active = isActive(conversation.partnerUsername);

                                return (
                                    <div
                                        key={conversation.partnerId}
                                        onClick={() => handleConversationClick(conversation.partnerUsername)}
                                        className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${active ? "bg-accent" : "hover:bg-accent/50"}`}
                                        title={conversation.partnerUsername}
                                    >
                                        <Avatar className="h-10 w-10 flex-shrink-0">
                                            <AvatarImage src={avatarSrc} alt={conversation.partnerUsername} />
                                            <AvatarFallback>{conversation.partnerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        {sidebarExpanded && (
                                            <>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="font-semibold text-sm truncate">{conversation.partnerUsername}</p>
                                                        <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</p>
                                                </div>

                                                {conversation.unreadCount > 0 && (
                                                    <Badge variant="default" className="ml-2 flex-shrink-0">
                                                        {conversation.unreadCount}
                                                    </Badge>
                                                )}
                                            </>
                                        )}

                                        {!sidebarExpanded && conversation.unreadCount > 0 && <div className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                            <MessageSquare className={`${sidebarExpanded ? "h-12 w-12" : "h-8 w-8"} text-muted-foreground`} />
                            {sidebarExpanded && <p className="text-sm text-muted-foreground">Henüz mesajlaşma geçmişiniz yok.</p>}
                        </div>
                    )}
                </div>

                {/* Search Section */}
                <div className="border-t p-4 flex-shrink-0 relative">
                    {sidebarExpanded ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Kullanıcı ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-9" />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 h-7 w-7"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSearchResults([]);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Search Results */}
                            {searchQuery.length >= 2 && (
                                <div className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto rounded-md border bg-card shadow-lg z-50">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground">Aranıyor...</div>
                                    ) : searchResults.length > 0 ? (
                                        <div className="divide-y">
                                            {searchResults.map((result) => {
                                                const avatarSrc = getImageUrl(result.imageUrl);
                                                return (
                                                    <div
                                                        key={result.id}
                                                        onClick={() => {
                                                            router.push(`/messages/${result.id}`);
                                                            setSearchQuery("");
                                                            setSearchResults([]);
                                                        }}
                                                        className="flex items-center gap-2 p-3 hover:bg-accent cursor-pointer"
                                                    >
                                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                                            <AvatarImage src={avatarSrc} alt={result.title} />
                                                            <AvatarFallback className="text-xs">{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{result.title}</p>
                                                            <p className="text-xs text-muted-foreground">Mesaj gönder</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-xs text-muted-foreground">Kullanıcı bulunamadı</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button variant="ghost" size="icon" className="w-full" onClick={() => setSidebarExpanded(true)} title="Kullanıcı ara">
                            <Search className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Sağ Taraf - Dinamik İçerik */}
            <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        </div>
    );
}
