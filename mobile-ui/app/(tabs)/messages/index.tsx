import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { AppTopBar } from '@/src/components/shell';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { EmptyState } from '@/src/components/common/EmptyState';
import { ConversationItem } from '@/src/components/messages/ConversationItem';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getConversations } from '@/src/api/messages';
import { SignalRContext } from '@/src/contexts/signalr-context';
import type { ConversationDto } from '@/src/models/message';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function MessagesListScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const queryClient = useQueryClient();
  const t = messages.messages;

  const { onConversationUpdated, onUnreadMessageCountUpdated } = useContext(SignalRContext);
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });

  useEffect(() => {
    const unsub1 = onConversationUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    const unsub2 = onUnreadMessageCountUpdated(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [onConversationUpdated, onUnreadMessageCountUpdated, queryClient]);

  const conversations = conversationsQuery.data ?? [];

  const filtered = search.trim()
    ? conversations.filter((c) =>
        c.partnerUsername.toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const renderItem = useCallback(
    ({ item }: { item: ConversationDto }) => (
      <ConversationItem
        conversation={item}
        onPress={() => router.push(`/(tabs)/messages/${item.partnerUsername}`)}
      />
    ),
    [router],
  );

  if (conversationsQuery.isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <AppTopBar title={t.title} />

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t.searchUsers}
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.partnerId)}
        refreshControl={
          <RefreshControl
            refreshing={conversationsQuery.isRefetching}
            onRefresh={() => conversationsQuery.refetch()}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={t.noConversations}
            description={t.selectConversation}
          />
        }
        contentContainerStyle={[
          filtered.length === 0 ? styles.emptyList : undefined,
          { paddingBottom: insets.bottom },
        ]}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  emptyList: {
    flex: 1,
  },
});
