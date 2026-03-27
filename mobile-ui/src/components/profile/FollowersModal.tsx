import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { Button } from '@/src/components/common/Button';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getFollowers, getFollowing, followUser, unfollowUser } from '@/src/api/social';
import type { SocialProfile } from '@/src/models/social';
import { getImageUrl } from '@/src/utils/image';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

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
  const fm = messages.profile.followersModal;
  const h = messages.profile.header;

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [search, setSearch] = useState('');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', username] });
      queryClient.invalidateQueries({ queryKey: ['following', username] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetUsername: string) => unfollowUser(targetUsername),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers', username] });
      queryClient.invalidateQueries({ queryKey: ['following', username] });
    },
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
    const displayName = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.username;

    return (
      <View style={[styles.userRow, { borderBottomColor: colors.border }]}>
        <Avatar uri={item.profileImageUrl} name={displayName} size={44} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
        {!isMe ? (
          <Button
            title={item.isFollowing ? fm.following : fm.follow}
            variant={item.isFollowing ? 'outline' : 'primary'}
            size="sm"
            onPress={() => handleToggleFollow(item)}
          />
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>@{username}</Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.tabs}>
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

        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
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
  list: {
    paddingHorizontal: Spacing.lg,
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
