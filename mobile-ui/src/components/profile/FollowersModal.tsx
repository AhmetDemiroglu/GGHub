import React, { useState, useMemo, useEffect } from 'react';
import { AiBadge } from '@/src/components/common/AiBadge';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { Button } from '@/src/components/common/Button';
import { BottomSheet, BottomSheetFlatList } from '@/src/components/common/BottomSheet';
import { useUserLink } from '@/src/components/common/UserLink';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getFollowers, getFollowing, followUser, unfollowUser } from '@/src/api/social';
import { displayName } from '@/src/utils/display-name';
import type { SocialProfile } from '@/src/models/social';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { invalidateFollowGraph } from '@/src/utils/query-invalidation';

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  initialTab?: 'followers' | 'following';
}

export function FollowersModal({
  visible,
  onClose,
  username,
  initialTab = 'followers',
}: FollowersModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canOpen, openProfile } = useUserLink();
  const fm = messages.profile.followersModal;

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [search, setSearch] = useState('');

  // Pencere artik surekli cizili (kapanis animasyonu oynasin diye); her acilista
  // istenen sekmeden ve bos aramayla baslar.
  useEffect(() => {
    if (!visible) return;
    setActiveTab(initialTab);
    setSearch('');
  }, [visible, initialTab]);

  const followersQuery = useQuery({
    queryKey: ['followers', username],
    queryFn: () => getFollowers(username),
    enabled: visible,
  });

  const followingQuery = useQuery({
    queryKey: ['following', username],
    queryFn: () => getFollowing(username),
    enabled: visible,
  });

  const followMutation = useMutation({
    mutationFn: (targetUsername: string) => followUser(targetUsername),
    // Pencerenin kendi listeleri (followers/following) dahil; takip edilen kisinin
    // profili ve kendi takip sayim da tazelenir.
    onSuccess: () => invalidateFollowGraph(queryClient),
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetUsername: string) => unfollowUser(targetUsername),
    onSuccess: () => invalidateFollowGraph(queryClient),
  });

  const data = activeTab === 'followers' ? followersQuery.data : followingQuery.data;

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (u: SocialProfile) =>
        u.username.toLowerCase().includes(q) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const handleToggleFollow = (item: SocialProfile) => {
    if (item.isFollowing) {
      unfollowMutation.mutate(item.username);
    } else {
      followMutation.mutate(item.username);
    }
  };

  const renderItem = ({ item }: { item: SocialProfile }) => {
    const isMe = user?.username === item.username;
    const name = displayName(item);
    // Gizli profil, profil ekraninda 404 verir; satir o zaman link OLMAZ.
    // (Bu kontrol eskiden hic yoktu ve gizli profillere de gidiliyordu.)
    const profileOpenable = canOpen(item);

    return (
      <Pressable
        style={[styles.userRow, { borderBottomColor: colors.border }]}
        disabled={!profileOpenable}
        onPress={() => {
          onClose();
          openProfile(item);
        }}
      >
        <Avatar uri={item.profileImageUrl} name={name} size={44} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {name}
            {item.isAiAgent ? <AiBadge /> : null}
          </Text>
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
        {!isMe ? (
          <Pressable onPress={(event) => event.stopPropagation()}>
            <Button
              title={item.isFollowing ? fm.following : fm.follow}
              variant={item.isFollowing ? 'outline' : 'primary'}
              size="sm"
              onPress={() => handleToggleFollow(item)}
            />
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  return (
    // Ortak alt pencere kabugu, tam boy. Eskiden tam ekran Modal + elle cizilmis
    // X/baslik kullaniyordu; diger pencerelerden farkli duruyor ve cekilemiyordu.
    <BottomSheet visible={visible} onClose={onClose} title={`@${username}`} size="full">
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['followers', 'following'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
              ]}
            >
              {tab === 'followers' ? fm.followersTab : fm.followingTab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={messages.common.search}
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <BottomSheetFlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
      />
    </BottomSheet>
  );
}

// Yatay bosluk pencerenin kendisinden gelir (BottomSheet paddingHorizontal).
const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  list: {
    paddingBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  userHandle: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
});
