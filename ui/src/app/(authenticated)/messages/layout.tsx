"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversations } from "@/api/messages/messages.api";
import { ConversationDto } from "@/models/messages/message.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Badge } from "@core/components/ui/badge";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import "dayjs/locale/en";
import { MessageSquare, ChevronRight, ChevronLeft, Search, X, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { searchMessageableUsers } from "@/api/search/search.api";
import { SearchResult } from "@/models/search/search.model";
import { useDebounce } from "@core/hooks/use-debounce";
import Link from "next/link";
import { useAuth } from "@core/hooks/use-auth";
import { UnauthorizedAccess } from "@core/components/other/unauthorized-access";
import { getImageUrl } from "@/core/lib/get-image-url";
import { useI18n, useCurrentLocale } from "@/core/contexts/locale-context";

dayjs.extend(relativeTime);

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    const t = useI18n();
    const locale = useCurrentLocale();
    const { user, isLoading: isAuthLoading } = useAuth();
    const pathname = usePathname();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    useEffect(() => {
        dayjs.locale(locale === "tr" ? "tr" : "en");
    }, [locale]);

    useEffect(() => {
        const handleResize = () => {
            setSidebarExpanded(window.innerWidth >= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 500);

    const { data: conversations, isLoading: isConversationsLoading } = useQuery<ConversationDto[]>({
        queryKey: ["conversations"],
        queryFn: getConversations,
        enabled: !!user,
    });

    useEffect(() => {
        if (debouncedSearch.length >= 2) {
            setIsSearching(true);
            searchMessageableUsers(debouncedSearch)
                .then((results) => setSearchResults(results))
                .catch(() => setSearchResults([]))
                .finally(() => setIsSearching(false));
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearch]);

    const isActive = (username: string) => pathname === `/messages/${username}`;

    if (isAuthLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    if (!user) {
        return <UnauthorizedAccess title={t("messages.loginRequired")} description={t("messages.loginRequiredDescription")} />;
    }

    return (
        <div className="flex h-full">
            {/* Conversation Sidebar */}
            <div className={`${sidebarExpanded ? "w-80" : "w-16"} flex shrink-0 flex-col border-r border-border/40 bg-card/50 transition-all duration-300`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/40 px-3 py-3 shrink-0">
                    {sidebarExpanded && <h1 className="text-base font-semibold">{t("messages.title")}</h1>}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground ${!sidebarExpanded ? "mx-auto" : ""}`}
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                    >
                        {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                    {isConversationsLoading ? (
                        <div className="flex items-center justify-center p-6">
                            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : conversations && conversations.length > 0 ? (
                        <div>
                            {conversations.map((conversation) => {
                                const avatarSrc = getImageUrl(conversation.partnerProfileImageUrl);
                                const timeAgo = dayjs(conversation.lastMessageSentAt).fromNow();
                                const active = isActive(conversation.partnerUsername);

                                return (
                                    <Link
                                        key={conversation.partnerId}
                                        href={`/messages/${conversation.partnerUsername}`}
                                        className={`group relative flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent/50 ${active ? "bg-accent" : ""}`}
                                    >
                                        {active && <span className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />}

                                        <Avatar className={`${sidebarExpanded ? "h-10 w-10" : "h-9 w-9"} shrink-0 ring-2 ring-transparent ${active ? "ring-primary/30" : ""}`}>
                                            <AvatarImage src={avatarSrc} alt={conversation.partnerUsername} />
                                            <AvatarFallback className="text-xs">{conversation.partnerUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        {sidebarExpanded && (
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className={`text-sm truncate ${active ? "font-semibold" : "font-medium"}`}>{conversation.partnerUsername}</p>
                                                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{timeAgo}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-muted-foreground truncate pr-2">{conversation.lastMessage}</p>
                                                    {conversation.unreadCount > 0 && (
                                                        <Badge variant="default" className="h-5 min-w-5 shrink-0 flex items-center justify-center p-0 text-[10px]">
                                                            {conversation.unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!sidebarExpanded && conversation.unreadCount > 0 && (
                                            <span className="absolute right-1.5 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            {sidebarExpanded && <p className="text-sm text-muted-foreground">{t("messages.noConversations")}</p>}
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="border-t border-border/40 p-3 shrink-0 relative">
                    {sidebarExpanded ? (
                        <div>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("messages.searchUsers")}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 pl-9 pr-9 text-sm"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-0.5 h-8 w-8"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setSearchResults([]);
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            {searchQuery.length >= 2 && (
                                <div className="absolute bottom-full left-3 right-3 mb-2 max-h-48 overflow-y-auto rounded-lg border border-border/40 bg-popover shadow-xl z-50">
                                    {isSearching ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <div>
                                            {searchResults.map((result) => (
                                                <Link
                                                    key={result.id}
                                                    href={`/messages/${result.id}`}
                                                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
                                                    onClick={() => {
                                                        setSearchQuery("");
                                                        setSearchResults([]);
                                                    }}
                                                >
                                                    <Avatar className="h-8 w-8 shrink-0">
                                                        <AvatarImage src={getImageUrl(result.imageUrl)} alt={result.title} />
                                                        <AvatarFallback className="text-xs">{result.title.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate">{result.title}</p>
                                                        <p className="text-xs text-muted-foreground">{t("messages.sendMessage")}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-xs text-muted-foreground">{t("messages.userNotFound")}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 mx-auto cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => setSidebarExpanded(true)}
                            title={t("messages.searchUsers")}
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        </div>
    );
}
