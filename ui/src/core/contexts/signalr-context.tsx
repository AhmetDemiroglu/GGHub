"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { useAuth } from "@core/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { MessageDto, ConversationDto } from "@/models/messages/message.model";
import { NotificationDto } from "@/models/notifications/notification.model";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

interface SignalRContextValue {
    connection: HubConnection | null;
    connectionStatus: ConnectionStatus;
    joinConversation: (partnerUsername: string) => Promise<void>;
    leaveConversation: (partnerUsername: string) => Promise<void>;
}

const SignalRContext = createContext<SignalRContextValue>({
    connection: null,
    connectionStatus: "disconnected",
    joinConversation: async () => {},
    leaveConversation: async () => {},
});

export function useSignalR() {
    return useContext(SignalRContext);
}

export function SignalRProvider({ children }: { children: ReactNode }) {
    const { accessToken, isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    const connectionRef = useRef<HubConnection | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

    const setupEventHandlers = useCallback(
        (connection: HubConnection) => {
            connection.on("ReceiveMessage", (message: MessageDto) => {
                // Update message thread if we're viewing this conversation
                const senderUsername = message.senderUsername;
                queryClient.setQueryData<MessageDto[]>(["messages", senderUsername], (old) => {
                    if (!old) return [message];
                    // Avoid duplicates
                    if (old.some((m) => m.id === message.id)) return old;
                    return [message, ...old];
                });

                // Invalidate conversations to get fresh data
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
                queryClient.invalidateQueries({ queryKey: ["recent-messages"] });
            });

            connection.on("UnreadMessageCountUpdated", (count: number) => {
                queryClient.setQueryData(["unread-message-count"], { count });
            });

            connection.on("UnreadNotificationCountUpdated", (count: number) => {
                queryClient.setQueryData(["unread-notification-count"], { count });
            });

            connection.on("ReceiveNotification", (notification: NotificationDto) => {
                queryClient.setQueryData<NotificationDto[]>(["notifications"], (old) => {
                    if (!old) return [notification];
                    if (old.some((n) => n.id === notification.id)) return old;
                    return [notification, ...old];
                });
            });

            connection.on("ConversationUpdated", (conversation: ConversationDto) => {
                queryClient.setQueryData<ConversationDto[]>(["conversations"], (old) => {
                    if (!old) return [conversation];
                    const filtered = old.filter((c) => c.partnerId !== conversation.partnerId);
                    return [conversation, ...filtered].sort(
                        (a, b) => new Date(b.lastMessageSentAt).getTime() - new Date(a.lastMessageSentAt).getTime()
                    );
                });

                queryClient.setQueryData<ConversationDto[]>(["recent-messages"], (old) => {
                    if (!old) return [conversation];
                    const filtered = old.filter((c) => c.partnerId !== conversation.partnerId);
                    return [conversation, ...filtered].sort(
                        (a, b) => new Date(b.lastMessageSentAt).getTime() - new Date(a.lastMessageSentAt).getTime()
                    );
                });
            });

            connection.on("MessagesRead", (readerUsername: string) => {
                // Update the message thread to reflect read status
                queryClient.invalidateQueries({ queryKey: ["messages", readerUsername] });
            });
        },
        [queryClient]
    );

    useEffect(() => {
        if (!isAuthenticated || !accessToken || !user) {
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
                setConnectionStatus("disconnected");
            }
            return;
        }

        // Sayfa yüklenmesini bloklamadan, idle anında bağlantıyı başlat
        let cancelled = false;
        const startConnection = () => {
            if (cancelled) return;

            const hubUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/chat`;

            const connection = new HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => accessToken,
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: (retryContext) => {
                        const delays = [0, 2000, 5000, 10000, 30000];
                        return delays[Math.min(retryContext.previousRetryCount, delays.length - 1)];
                    },
                })
                .configureLogging(LogLevel.Warning)
                .build();

            connection.onreconnecting(() => setConnectionStatus("reconnecting"));

            connection.onreconnected(() => {
                setConnectionStatus("connected");
                queryClient.invalidateQueries({ queryKey: ["unread-message-count"] });
                queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
                queryClient.invalidateQueries({ queryKey: ["conversations"] });
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
            });

            connection.onclose(() => setConnectionStatus("disconnected"));

            setupEventHandlers(connection);

            setConnectionStatus("connecting");
            connection
                .start()
                .then(() => {
                    if (!cancelled) {
                        setConnectionStatus("connected");
                        connectionRef.current = connection;
                    } else {
                        connection.stop();
                    }
                })
                .catch((err) => {
                    console.error("SignalR connection failed:", err);
                    if (!cancelled) setConnectionStatus("disconnected");
                });
        };

        // requestIdleCallback ile sayfa render'ı bittikten sonra bağlan
        const idleId = typeof window !== "undefined" && "requestIdleCallback" in window
            ? window.requestIdleCallback(startConnection, { timeout: 3000 })
            : setTimeout(startConnection, 1500);

        return () => {
            cancelled = true;
            if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof idleId === "number") {
                window.cancelIdleCallback(idleId);
            } else {
                clearTimeout(idleId as ReturnType<typeof setTimeout>);
            }
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
                setConnectionStatus("disconnected");
            }
        };
    }, [isAuthenticated, accessToken, user, setupEventHandlers, queryClient]);

    const joinConversation = useCallback(
        async (partnerUsername: string) => {
            if (connectionRef.current?.state === HubConnectionState.Connected) {
                await connectionRef.current.invoke("JoinConversation", partnerUsername);
            }
        },
        []
    );

    const leaveConversation = useCallback(
        async (partnerUsername: string) => {
            if (connectionRef.current?.state === HubConnectionState.Connected) {
                await connectionRef.current.invoke("LeaveConversation", partnerUsername);
            }
        },
        []
    );

    return (
        <SignalRContext.Provider
            value={{
                connection: connectionRef.current,
                connectionStatus,
                joinConversation,
                leaveConversation,
            }}
        >
            {children}
        </SignalRContext.Provider>
    );
}
