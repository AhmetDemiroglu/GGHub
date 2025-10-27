"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@core/components/ui/dialog";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@core/components/ui/avatar";
import { Send, X } from "lucide-react";
import { sendMessage, getMessageThread } from "@/api/messages/messages.api";
import { MessageDto, MessageForCreationDto } from "@/models/messages/message.model";
import { useAuth } from "@core/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";

dayjs.extend(relativeTime);
dayjs.locale("tr");

interface MessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipientUsername: string;
    recipientProfileImageUrl?: string | null;
}

export function MessageDialog({ open, onOpenChange, recipientUsername, recipientProfileImageUrl }: MessageDialogProps) {
    const [content, setContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return undefined;
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
        return `${API_BASE}${path}`;
    };

    const avatarSrc = getImageUrl(recipientProfileImageUrl);

    // Messages query
    const { data: messages, isLoading } = useQuery<MessageDto[]>({
        queryKey: ["message-dialog", recipientUsername],
        queryFn: () => getMessageThread(recipientUsername),
        enabled: open,
        refetchInterval: open ? 5000 : false,
    });

    const sendMutation = useMutation({
        mutationFn: (data: MessageForCreationDto) => sendMessage(data),
        onSuccess: () => {
            setContent("");
            queryClient.invalidateQueries({ queryKey: ["message-dialog", recipientUsername] });
            scrollToBottom();
        },
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (open && messages && messages.length > 0) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [open]);

    const handleSend = () => {
        if (!content.trim()) return;

        sendMutation.mutate({
            recipientUsername,
            content: content.trim(),
        });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col p-0">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={avatarSrc} alt={recipientUsername} />
                            <AvatarFallback>{recipientUsername.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-base">{recipientUsername}</DialogTitle>
                            <p className="text-xs text-muted-foreground">Mesajlaşma</p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                        </div>
                    ) : messages && messages.length > 0 ? (
                        messages
                            .slice()
                            .reverse()
                            .map((message) => {
                                const isOwnMessage = user?.id ? message.senderId === parseInt(user.id) : false;
                                const time = dayjs(message.sentAt).format("HH:mm");

                                return (
                                    <div key={message.id} className={`flex gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                        {!isOwnMessage && (
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={avatarSrc} alt={recipientUsername} />
                                                <AvatarFallback className="text-xs">{recipientUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        )}

                                        <div className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                            <p className="text-sm break-words">{message.content}</p>
                                            <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{time}</p>
                                        </div>

                                        {isOwnMessage && (
                                            <Avatar className="h-8 w-8 flex-shrink-0">
                                                <AvatarImage src={getImageUrl(message.senderProfileImageUrl)} alt="Sen" />
                                                <AvatarFallback className="text-xs">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                );
                            })
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-muted-foreground">Henüz mesaj yok. İlk mesajı gönderin!</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-6 py-4 border-t flex-shrink-0">
                    <div className="flex gap-2">
                        <Input placeholder="Mesajınızı yazın..." value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={handleKeyPress} disabled={sendMutation.isPending} />
                        <Button onClick={handleSend} disabled={!content.trim() || sendMutation.isPending}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
