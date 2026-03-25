"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageThread, sendMessage } from "@/api/messages/messages.api";
import { MessageDto, MessageForCreationDto } from "@/models/messages/message.model";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Button } from "@core/components/ui/button";
import { Textarea } from "@core/components/ui/textarea";
import { useAuth } from "@core/hooks/use-auth";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { Send, AlertTriangle, Loader, MessageSquare } from "lucide-react";
import { UnauthorizedAccess } from "@core/components/other/unauthorized-access";
import { AxiosError } from "axios";
import { getImageUrl } from "@/core/lib/get-image-url";
import { useI18n } from "@/core/contexts/locale-context";

export default function MessageThreadPage() {
    const params = useParams();
    const username = params.username as string;
    const { user } = useAuth();
    const t = useI18n();
    const queryClient = useQueryClient();

    const [messageContent, setMessageContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: messages, isLoading } = useQuery<MessageDto[]>({
        queryKey: ["messages", username],
        queryFn: () => getMessageThread(username),
    });

    const sendMutation = useMutation({
        mutationFn: (data: MessageForCreationDto) => sendMessage(data),
        onSuccess: (sentMessage: MessageDto) => {
            setMessageContent("");
            queryClient.setQueryData<MessageDto[]>(["messages", username], (old) => {
                if (!old) return [sentMessage];
                if (old.some((m) => m.id === sentMessage.id)) return old;
                return [sentMessage, ...old];
            });
            scrollToBottom();
        },
        onError: (error: unknown) => {
            if (error instanceof AxiosError && (error.response as unknown as { isRateLimitError?: boolean })?.isRateLimitError) {
                return;
            }
            toast.error(t("messages.sendFailed"));
        },
    });

    const handleSend = () => {
        if (!messageContent.trim()) return;
        sendMutation.mutate({
            recipientUsername: username,
            content: messageContent.trim(),
        });
    };

    const isFirstRender = useRef(true);

    const scrollToBottom = (instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth" });
    };

    useEffect(() => {
        scrollToBottom(isFirstRender.current);
        isFirstRender.current = false;
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return <UnauthorizedAccess title={t("messages.viewLoginRequired")} description={t("messages.viewLoginRequiredDescription")} />;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-border/40 px-5 py-3 shrink-0 bg-card/30">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarImage
                        src={
                            messages && messages.length > 0
                                ? getImageUrl(messages[0].senderId === parseInt(user?.id || "0") ? messages[0].recipientProfileImageUrl : messages[0].senderProfileImageUrl)
                                : undefined
                        }
                        alt={username}
                    />
                    <AvatarFallback className="text-sm">{username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="text-sm font-semibold leading-tight">{username}</h2>
                    <p className="text-xs text-muted-foreground">{t("messages.online") ?? "Online"}</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {messages && messages.length > 0 ? (
                    <div className="space-y-3">
                        {messages
                            .slice()
                            .reverse()
                            .map((message, index, arr) => {
                                const isOwnMessage = user?.id ? message.senderId === parseInt(user.id) : false;
                                const time = dayjs(message.sentAt).format("HH:mm");
                                const avatarSrc = getImageUrl(message.senderProfileImageUrl);
                                const displayUsername = message.senderUsername;

                                // Show avatar only if next message is from different sender or it's the last message
                                const nextMsg = arr[index + 1];
                                const isLastInGroup = !nextMsg || (nextMsg.senderId !== message.senderId);

                                return (
                                    <div key={message.id} className={`flex gap-2.5 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                        {!isOwnMessage && (
                                            <div className="w-8 shrink-0">
                                                {isLastInGroup && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={avatarSrc} alt={displayUsername} />
                                                        <AvatarFallback className="text-[10px]">{displayUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        )}

                                        <div className={`flex flex-col max-w-[65%] ${isOwnMessage ? "items-end" : "items-start"}`}>
                                            <div
                                                className={`rounded-2xl px-3.5 py-2 ${
                                                    isOwnMessage
                                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                                        : "bg-muted rounded-bl-md"
                                                }`}
                                            >
                                                <p className="text-sm leading-relaxed wrap-break-word">{message.content}</p>
                                            </div>
                                            {isLastInGroup && (
                                                <span className={`text-[10px] text-muted-foreground mt-1 ${isOwnMessage ? "mr-1" : "ml-1"}`}>
                                                    {time}
                                                </span>
                                            )}
                                        </div>

                                        {isOwnMessage && (
                                            <div className="w-8 shrink-0">
                                                {isLastInGroup && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={avatarSrc} alt={displayUsername} />
                                                        <AvatarFallback className="text-[10px]">{displayUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">{t("messages.noMessages")}</p>
                    </div>
                )}
            </div>

            {/* Security Warning */}
            <div className="flex items-center justify-center gap-1.5 px-4 py-1.5 shrink-0">
                <AlertTriangle className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <p className="text-[11px] text-muted-foreground/60">{t("messages.securityWarning")}</p>
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-border/40 bg-card/30 px-4 py-3">
                <div className="flex items-end gap-2">
                    <Textarea
                        placeholder={t("messages.typeMessage")}
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="min-h-10 max-h-32 resize-none rounded-xl border-border/40 bg-background/50 text-sm"
                        rows={1}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!messageContent.trim() || sendMutation.isPending}
                        size="icon"
                        className="h-10 w-10 shrink-0 rounded-xl"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
