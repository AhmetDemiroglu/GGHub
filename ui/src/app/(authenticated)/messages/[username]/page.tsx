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
import { Send } from "lucide-react";

const getImageUrl = (path: string | null | undefined) => {
    if (!path) return undefined;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    return `${API_BASE}${path}`;
};

export default function MessageThreadPage() {
    const params = useParams();
    const username = params.username as string;
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [messageContent, setMessageContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: messages, isLoading } = useQuery<MessageDto[]>({
        queryKey: ["messages", username],
        queryFn: () => getMessageThread(username),
        refetchInterval: 3000,
    });

    const sendMutation = useMutation({
        mutationFn: (data: MessageForCreationDto) => sendMessage(data),
        onSuccess: () => {
            setMessageContent("");
            queryClient.invalidateQueries({ queryKey: ["messages", username] });
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            scrollToBottom();
        },
        onError: (error: any) => {
            const errorMessage = error.response?.data || "Mesaj gönderilemedi.";
            toast.error(errorMessage);
        },
    });

    const handleSend = () => {
        if (!messageContent.trim()) return;

        sendMutation.mutate({
            recipientUsername: username,
            content: messageContent.trim(),
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b p-4 bg-card flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage
                            src={
                                messages && messages.length > 0
                                    ? getImageUrl(messages[0].senderId === parseInt(user?.id || "0") ? messages[0].recipientProfileImageUrl : messages[0].senderProfileImageUrl)
                                    : undefined
                            }
                            alt={username}
                        />
                        <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h2 className="font-semibold text-lg">{username}</h2>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages && messages.length > 0 ? (
                    messages
                        .slice()
                        .reverse()
                        .map((message) => {
                            const isOwnMessage = user?.id ? message.senderId === parseInt(user.id) : false;
                            const time = dayjs(message.sentAt).format("HH:mm");
                            const avatarSrc = getImageUrl(isOwnMessage ? message.senderProfileImageUrl : message.senderProfileImageUrl);
                            const displayUsername = isOwnMessage ? message.senderUsername : message.senderUsername;

                            return (
                                <div key={message.id} className={`flex gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                    {!isOwnMessage && (
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={avatarSrc} alt={displayUsername} />
                                            <AvatarFallback className="text-xs">{displayUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div className="flex flex-col max-w-[70%]">
                                        {!isOwnMessage && <span className="text-xs text-muted-foreground mb-1 ml-1">{displayUsername}</span>}
                                        <div className={`rounded-lg p-3 ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                            <p className="text-sm break-words">{message.content}</p>
                                            <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{time}</p>
                                        </div>
                                    </div>

                                    {isOwnMessage && (
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={avatarSrc} alt={displayUsername} />
                                            <AvatarFallback className="text-xs">{displayUsername.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            );
                        })
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Henüz mesaj yok. İlk mesajı gönderin!</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-card flex-shrink-0">
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Mesajınızı yazın..."
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        className="resize-none"
                        rows={2}
                    />
                    <Button onClick={handleSend} disabled={!messageContent.trim() || sendMutation.isPending} className="px-4">
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
