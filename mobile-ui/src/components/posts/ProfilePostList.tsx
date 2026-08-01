import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getUserPosts } from '@/src/api/post';
import { PostCard } from '@/src/components/posts/PostCard';
import { FontSize, Spacing } from '@/src/constants/theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';

interface ProfilePostListProps {
  username: string;
  enabled: boolean;
}

/**
 * Profildeki "Gonderiler" sekmesi.
 *
 * Gizlilik tamamen SUNUCUDA: uc once ProfileContentAccess kapisini, sonra
 * gonderi gorunurlugunu uyguluyor. Burada ek bir kapi YOK, olsaydi ikinci bir
 * kural kaynagi olur ve zamanla sapabilirdi.
 *
 * Sayfalama yok: profil ekrani zaten tek bir disardaki ScrollView icinde
 * (sekmelerin hepsi scrollEnabled=false liste kullaniyor); ilk 20 gonderi
 * gosteriliyor, devami gonderi detayindan ve akistan gezilebiliyor.
 */
export function ProfilePostList({ username, enabled }: ProfilePostListProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();

  const { data, isLoading } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => getUserPosts(username, 20),
    enabled: enabled && !!username,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const posts = data ?? [];

  if (posts.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>
        {messages.posts.profileEmptyTitle}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  list: {
    gap: Spacing.md,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
});
