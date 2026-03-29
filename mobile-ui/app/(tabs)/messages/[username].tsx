import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { Avatar } from '@/src/components/common/Avatar';
import { MessageBubble } from '@/src/components/messages/MessageBubble';
import { ChatInput } from '@/src/components/messages/ChatInput';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getMessageThread, sendMessage } from '@/src/api/messages';
import { SignalRContext } from '@/src/contexts/signalr-context';
import type { MessageDto } from '@/src/models/message';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function MessageThreadScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { messages: i18n } = useLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const t = i18n.messages;

  const { joinConversation, leaveConversation, onReceiveMessage, onMessagesRead } =
    useContext(SignalRContext);

  const [localMessages, setLocalMessages] = useState<MessageDto[]>([]);

  const threadQuery = useQuery({
    queryKey: ['messageThread', username],
    queryFn: () => getMessageThread(username!),
    enabled: !!username,
  });

  useEffect(() => {
    if (threadQuery.data) {
      setLocalMessages([...threadQuery.data].reverse());
    }
  }, [threadQuery.data]);

  useEffect(() => {
    if (!username) return;
    joinConversation(username);
    return () => {
      leaveConversation(username);
    };
  }, [username, joinConversation, leaveConversation]);

  useEffect(() => {
    const unsub1 = onReceiveMessage((...args: unknown[]) => {
      const msg = args[0] as MessageDto;
      if (
        msg &&
        (msg.senderUsername === username || msg.recipientUsername === username)
      ) {
        setLocalMessages((prev) => [msg, ...prev]);
      }
    });

    const unsub2 = onMessagesRead(() => {
      queryClient.invalidateQueries({ queryKey: ['messageThread', username] });
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [username, onReceiveMessage, onMessagesRead, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage({ recipientUsername: username!, content }),
    onSuccess: (newMsg) => {
      setLocalMessages((prev) => [newMsg, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = useCallback(
    (text: string) => {
      sendMutation.mutate(text);
    },
    [sendMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: MessageDto }) => {
      const isMine = item.senderUsername === user?.username;
      return (
        <MessageBubble
          content={item.content}
          sentAt={item.sentAt}
          isMine={isMine}
          isRead={!!item.readAt}
        />
      );
    },
    [user?.username],
  );

  if (threadQuery.isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper noPadding edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Avatar uri={null} name={username} size={36} />
        <Text style={[styles.headerUsername, { color: colors.text }]}>{username}</Text>
      </View>

      <View style={[styles.securityBanner, { backgroundColor: colors.surfaceHighlight }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.securityText, { color: colors.textMuted }]}>
          {t.securityWarning}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={localMessages}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          inverted
          contentContainerStyle={styles.messagesList}
        />
        <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerUsername: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  securityText: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  messagesList: {
    paddingVertical: Spacing.sm,
  },
});
