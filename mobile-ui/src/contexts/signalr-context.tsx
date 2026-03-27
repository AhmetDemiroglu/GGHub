import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { API_BASE_URL, APP_CONFIG } from '@/src/constants/config';
import { useAuth } from '@/src/hooks/use-auth';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type SignalRCallback = (...args: unknown[]) => void;

export interface SignalRContextValue {
  connectionStatus: ConnectionStatus;
  joinConversation: (conversationId: string) => Promise<void>;
  leaveConversation: (conversationId: string) => Promise<void>;
  onReceiveMessage: (callback: SignalRCallback) => () => void;
  onUnreadMessageCountUpdated: (callback: SignalRCallback) => () => void;
  onUnreadNotificationCountUpdated: (callback: SignalRCallback) => () => void;
  onReceiveNotification: (callback: SignalRCallback) => () => void;
  onConversationUpdated: (callback: SignalRCallback) => () => void;
  onMessagesRead: (callback: SignalRCallback) => () => void;
}

export const SignalRContext = createContext<SignalRContextValue>({
  connectionStatus: 'disconnected',
  joinConversation: async () => {},
  leaveConversation: async () => {},
  onReceiveMessage: () => () => {},
  onUnreadMessageCountUpdated: () => () => {},
  onUnreadNotificationCountUpdated: () => () => {},
  onReceiveNotification: () => () => {},
  onConversationUpdated: () => () => {},
  onMessagesRead: () => () => {},
});

function useEventCallbacks() {
  const callbacksRef = useRef<Map<string, Set<SignalRCallback>>>(new Map());

  const register = useCallback((event: string, callback: SignalRCallback) => {
    if (!callbacksRef.current.has(event)) {
      callbacksRef.current.set(event, new Set());
    }
    callbacksRef.current.get(event)!.add(callback);

    return () => {
      callbacksRef.current.get(event)?.delete(callback);
    };
  }, []);

  const invoke = useCallback((event: string, ...args: unknown[]) => {
    callbacksRef.current.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch {
        // Callback error
      }
    });
  }, []);

  return { register, invoke };
}

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const connectionRef = useRef<HubConnection | null>(null);
  const { register, invoke } = useEventCallbacks();

  const joinConversation = useCallback(async (conversationId: string) => {
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      try {
        await connection.invoke('JoinConversation', conversationId);
      } catch {
        // Join failed
      }
    }
  }, []);

  const leaveConversation = useCallback(async (conversationId: string) => {
    const connection = connectionRef.current;
    if (connection?.state === HubConnectionState.Connected) {
      try {
        await connection.invoke('LeaveConversation', conversationId);
      } catch {
        // Leave failed
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setConnectionStatus('disconnected');
      }
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/chat`, {
        accessTokenFactory: () => accessToken,
      })
      .withAutomaticReconnect(APP_CONFIG.signalRReconnectDelays)
      .configureLogging(LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    const events = [
      'ReceiveMessage',
      'UnreadMessageCountUpdated',
      'UnreadNotificationCountUpdated',
      'ReceiveNotification',
      'ConversationUpdated',
      'MessagesRead',
    ];

    events.forEach((event) => {
      connection.on(event, (...args: unknown[]) => {
        invoke(event, ...args);
      });
    });

    connection.onreconnecting(() => {
      setConnectionStatus('reconnecting');
    });

    connection.onreconnected(() => {
      setConnectionStatus('connected');
    });

    connection.onclose(() => {
      setConnectionStatus('disconnected');
    });

    const startConnection = async () => {
      setConnectionStatus('connecting');
      try {
        await connection.start();
        setConnectionStatus('connected');
      } catch {
        setConnectionStatus('disconnected');
      }
    };

    startConnection();

    return () => {
      connection.stop();
      connectionRef.current = null;
      setConnectionStatus('disconnected');
    };
  }, [isAuthenticated, accessToken, invoke]);

  const onReceiveMessage = useCallback(
    (callback: SignalRCallback) => register('ReceiveMessage', callback),
    [register],
  );

  const onUnreadMessageCountUpdated = useCallback(
    (callback: SignalRCallback) => register('UnreadMessageCountUpdated', callback),
    [register],
  );

  const onUnreadNotificationCountUpdated = useCallback(
    (callback: SignalRCallback) => register('UnreadNotificationCountUpdated', callback),
    [register],
  );

  const onReceiveNotification = useCallback(
    (callback: SignalRCallback) => register('ReceiveNotification', callback),
    [register],
  );

  const onConversationUpdated = useCallback(
    (callback: SignalRCallback) => register('ConversationUpdated', callback),
    [register],
  );

  const onMessagesRead = useCallback(
    (callback: SignalRCallback) => register('MessagesRead', callback),
    [register],
  );

  const value: SignalRContextValue = {
    connectionStatus,
    joinConversation,
    leaveConversation,
    onReceiveMessage,
    onUnreadMessageCountUpdated,
    onUnreadNotificationCountUpdated,
    onReceiveNotification,
    onConversationUpdated,
    onMessagesRead,
  };

  return <SignalRContext.Provider value={value}>{children}</SignalRContext.Provider>;
}
