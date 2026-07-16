import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { UserLinkAvatar, UserLinkName } from '@/src/components/common/UserLink';
import { MessageBubble } from '@/src/components/messages/MessageBubble';
import { ChatInput } from '@/src/components/messages/ChatInput';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { AuthRequiredView } from '@/src/components/common/AuthRequiredView';
import { getMessageThread, sendMessage } from '@/src/api/messages';
import { SignalRContext } from '@/src/contexts/signalr-context';
import type { MessageDto } from '@/src/models/message';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import * as haptics from '@/src/utils/haptics';

export default function MessageThreadScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { messages: i18n } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const t = i18n.messages;
  const tabBarHeight = useTabBarHeight();

  // Klavye açıkken input klavyenin hemen üstüne, kapalıyken tab bar'ın hemen
  // üstüne otursun. useAnimatedKeyboard değeri UI thread'de aktığı için geçiş
  // klavye animasyonuyla birebir senkron olur.
  const keyboard = useAnimatedKeyboard();
  const inputAreaStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(tabBarHeight, keyboard.height.value),
  }));

  const {
    connectionStatus,
    joinConversation,
    leaveConversation,
    onReceiveMessage,
    onMessagesRead,
  } = useContext(SignalRContext);

  const [localMessages, setLocalMessages] = useState<MessageDto[]>([]);

  const threadQuery = useQuery({
    queryKey: ['messageThread', username],
    queryFn: () => getMessageThread(username!),
    enabled: !!username && isAuthenticated,
    // Sohbet her acilista taze cekilsin: aksi halde global staleTime yuzunden,
    // ekran disindayken gelen mesaj acilinca gorunmuyordu.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (threadQuery.data) {
      // inverted FlatList: index 0 en altta. En yeni mesaj altta olmali, bu yuzden
      // sentAt'e gore kesin azalan sirala (backend sirasina guvenme).
      const sorted = [...threadQuery.data].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      );
      setLocalMessages(sorted);
      // Backend bu GET'te okunmamislari okundu isaretledi. Konusma listesi + topbar
      // sayacini hemen tazele; boylece SignalR echo'su dusse bile (Android doze)
      // rozet guncellenir ve "gir-cik okundu olmuyor" sorunu kalmaz.
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-message-count'] });
    }
  }, [threadQuery.data, queryClient]);

  // Socket BAGLANDIKTAN sonra join et. Cold-start'ta ekran, baglanti kurulmadan mount
  // oluyordu; joinConversation sessizce atlaniyor ve bir daha denenmedigi icin ekran
  // acikken gelen canli mesajlar kaciriliyordu. connectionStatus bagimliligi, baglanti
  // kurulunca (ve reconnect sonrasi) join'i otomatik tekrarlar.
  useEffect(() => {
    if (!username || connectionStatus !== 'connected') return;
    joinConversation(username);
    return () => {
      leaveConversation(username);
    };
  }, [username, connectionStatus, joinConversation, leaveConversation]);

  useEffect(() => {
    const unsub1 = onReceiveMessage((...args: unknown[]) => {
      const msg = args[0] as MessageDto;
      if (
        msg &&
        (msg.senderUsername === username || msg.recipientUsername === username)
      ) {
        setLocalMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev],
        );
        // Ekran acikken partner'dan mesaj gelirse aninda okundu yap: thread GET'i
        // tekrar cagir (backend okunmamislari isaretler + gondericiye okundu yayar).
        if (msg.senderUsername === username) {
          queryClient.invalidateQueries({ queryKey: ['messageThread', username] });
        }
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
      setLocalMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [newMsg, ...prev],
      );
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = useCallback(
    (text: string) => {
      haptics.impactLight();
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

  if (!isAuthenticated) return <AuthRequiredView />;

  // Gosterecek mesaj yokken fetch suruyorsa BOS liste degil loading goster: bildirimle
  // gelindiginde sorgu (enabled: isAuthenticated) bir tik gec basliyor ve disabled sorgu
  // "isLoading" sayilmadigi icin, bildirime konu mesaj hic yokmus gibi bos ekran
  // goruluyordu (kullanici cikip tekrar giriyordu).
  if ((threadQuery.isLoading || threadQuery.isFetching) && localMessages.length === 0) {
    return <LoadingScreen />;
  }

  // Thread'in karsi tarafi. MessageDto artik gonderen/aliciyi tam UserDto olarak
  // tasiyor: gercek ad ve isProfileAccessible buradan gelir. Eski yanitlar icin
  // username + duz resim alanina duseriz.
  const partnerAvatarUrl =
    localMessages.find((m) => m.senderUsername === username && m.senderProfileImageUrl)
      ?.senderProfileImageUrl ??
    localMessages.find((m) => m.recipientUsername === username && m.recipientProfileImageUrl)
      ?.recipientProfileImageUrl ??
    null;

  const partnerUser =
    localMessages.find((m) => m.senderUsername === username)?.sender ??
    localMessages.find((m) => m.recipientUsername === username)?.recipient ??
    { username, profileImageUrl: partnerAvatarUrl };

  return (
    <ScreenWrapper noPadding edges={['top']} swipeBackEnabled={false}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => {
            haptics.impactLight();
            router.back();
          }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <UserLinkAvatar user={partnerUser} size={36} />
        <UserLinkName
          user={partnerUser}
          variant="username"
          style={[styles.headerUsername, { color: colors.text }]}
        />
      </View>

      <View style={[styles.securityBanner, { backgroundColor: colors.surfaceHighlight }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
        <Text style={[styles.securityText, { color: colors.textMuted }]}>
          {t.securityWarning}
        </Text>
      </View>

      <Animated.View style={[styles.flex, inputAreaStyle]}>
        <FlatList
          ref={flatListRef}
          data={localMessages}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          inverted
          style={styles.flex}
          contentContainerStyle={styles.messagesList}
        />
        <ChatInput onSend={handleSend} disabled={sendMutation.isPending} />
      </Animated.View>
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
