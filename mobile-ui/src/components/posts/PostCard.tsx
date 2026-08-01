import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { deletePost, setPostLike, setPostRepost } from '@/src/api/post';
import { Avatar } from '@/src/components/common/Avatar';
import { useConfirm } from '@/src/components/common/ConfirmDialog';
import { useToast } from '@/src/components/common/Toast';
import { PostImageGrid } from '@/src/components/posts/PostImageGrid';
import { PostPollView } from '@/src/components/posts/PostPollView';
import { PostText } from '@/src/components/posts/PostText';
import { ReportActionSheet } from '@/src/components/reports/ReportActionSheet';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { formatRelativeTime } from '@/src/utils/date';
import { displayName } from '@/src/utils/display-name';
import * as haptics from '@/src/utils/haptics';
import type { Post } from '@/src/models/post';

interface PostCardProps {
  post: Post;
  /** Detayda kart daha genis tipografiyle cizilir ve gonderiye gitmez. */
  variant?: 'feed' | 'detail';
  onDeleted?: (postId: number) => void;
}

export function PostCard({ post, variant = 'feed', onDeleted }: PostCardProps) {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  // Repost kartinda GORUNEN icerik kaynak gonderidir; sayaclar da kaynagin
  // sayaclaridir (X'te oldugu gibi). Repost eden kisi ust satirda gosterilir.
  const isRepost = Boolean(post.repostOf);
  const subject = post.repostOf ?? post;

  const [reportOpen, setReportOpen] = useState(false);
  const [liked, setLiked] = useState(subject.isLiked);
  const [likeCount, setLikeCount] = useState(subject.likeCount);
  const [reposted, setReposted] = useState(subject.isReposted);
  const [repostCount, setRepostCount] = useState(subject.repostCount);
  const [deleted, setDeleted] = useState(false);

  // Anket bileseniyle ayni sorun: yerel sayaclar ilk prop'ta donup kaliyordu ve
  // sunucudan gelen TAZE kart (refetch, ya da ayni gonderinin baska bir yerde
  // begenilmis hali) yutuluyordu. Kimlik degisince sunucuya teslim ol.
  const [syncedFrom, setSyncedFrom] = useState(subject);
  if (subject !== syncedFrom) {
    setSyncedFrom(subject);
    setLiked(subject.isLiked);
    setLikeCount(subject.likeCount);
    setReposted(subject.isReposted);
    setRepostCount(subject.repostCount);
  }

  const likeMutation = useMutation({
    mutationFn: (next: boolean) => setPostLike(subject.id, next),
    onSuccess: (result) => {
      setLiked(result.isLiked);
      setLikeCount(result.likeCount);
    },
    onError: () => {
      // Iyimser guncelleme geri alinir; sunucu gercegi kazanir.
      setLiked(subject.isLiked);
      setLikeCount(subject.likeCount);
      showToast('error', messages.posts.likeError);
    },
  });

  const repostMutation = useMutation({
    mutationFn: (next: boolean) => setPostRepost(subject.id, next),
    onSuccess: (result) => {
      setReposted(result.isReposted);
      setRepostCount(result.repostCount);
    },
    onError: () => {
      setReposted(subject.isReposted);
      setRepostCount(subject.repostCount);
      showToast('error', messages.posts.repostError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      setDeleted(true);
      onDeleted?.(post.id);
      showToast('success', messages.posts.deleted);
    },
    onError: () => showToast('error', messages.posts.deleteError),
  });

  if (deleted) return null;

  const author = subject.author;
  const timeAgo = formatRelativeTime(post.createdAt, locale);

  /**
   * Raporlanan sey kartta GORUNEN icerik, yani repost kartinda kaynak gonderi.
   * Kendi icerigini raporlamak sunucuda zaten reddediliyor; menuyu bosuna
   * gostermemek icin ayni kontrol burada da var.
   */
  const canReport = isAuthenticated && Number(user?.id) !== author.id;

  const toggleLike = () => {
    if (!isAuthenticated) return;
    haptics.impactLight();
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    likeMutation.mutate(next);
  };

  const toggleRepost = () => {
    if (!isAuthenticated) return;
    haptics.impactLight();
    const next = !reposted;
    setReposted(next);
    setRepostCount((c) => c + (next ? 1 : -1));
    repostMutation.mutate(next);
  };

  const askDelete = async () => {
    // Native Alert KULLANILMAZ; onay her zaman ConfirmDialog uzerinden.
    const ok = await confirm({
      title: messages.posts.delete,
      message: messages.posts.deleteConfirm,
      confirmLabel: messages.posts.delete,
      destructive: true,
    });
    if (ok) deleteMutation.mutate();
  };

  const openDetail = () => {
    if (variant === 'detail') return;
    haptics.impactLight();
    router.push(`/posts/${subject.id}` as never);
  };

  const openProfile = () => {
    haptics.impactLight();
    router.push(`/profiles/${author.username}` as never);
  };

  // Kartin BOS alani da gonderi detayini acar (X davranisi). Ic Pressable'lar
  // (avatar, isim, anket, aksiyonlar) dokunmayi kendileri yakalar; RN'de en
  // icteki responder oldugu icin disaridaki devreye girmez, ayrica yayilim
  // durdurmak gerekmiyor.
  return (
    <Pressable
      onPress={openDetail}
      disabled={variant === 'detail'}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {isRepost ? (
        <View style={styles.contextRow}>
          <Ionicons name="repeat" size={13} color={colors.textSecondary} />
          <Text style={[styles.contextText, { color: colors.textSecondary }]}>
            {messages.posts.repostedBy.replace('{username}', post.author.username)}
          </Text>
        </View>
      ) : null}

      {subject.parentAuthorUsername ? (
        <Text style={[styles.contextText, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>
          {messages.posts.replyingTo.replace('{username}', subject.parentAuthorUsername)}
        </Text>
      ) : null}

      <View style={styles.row}>
        <Pressable onPress={openProfile}>
          <Avatar uri={author.profileImageUrl} name={author.username} size={38} />
        </Pressable>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            {/* Kart gövdesi detaya gittigi icin isim/kullanici adi profile giden
                acik hedef olarak kaliyor; yoksa profile tek yol kucuk avatar olurdu. */}
            <Pressable style={styles.headerText} onPress={openProfile}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {displayName(author)}
              </Text>
              <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
                @{author.username} · {timeAgo}
              </Text>
            </Pressable>

            {/* Sahibi silme onayina, digerleri rapor sayfasina gider: ikisi ayni
                anda gecerli olamaz (kendi gonderini raporlayamazsin). */}
            {post.canDelete || canReport ? (
              <Pressable
                onPress={post.canDelete ? askDelete : () => setReportOpen(true)}
                hitSlop={8}
                style={styles.moreButton}
              >
                <Ionicons
                  name={post.canDelete ? 'ellipsis-horizontal' : 'flag-outline'}
                  size={16}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={openDetail} disabled={variant === 'detail'}>
            {subject.content ? (
              <PostText
                body={subject.content}
                mentions={subject.mentions}
                style={[
                  styles.content,
                  { color: colors.text, fontSize: variant === 'detail' ? FontSize.md : FontSize.sm },
                ]}
              />
            ) : null}

            <PostImageGrid images={subject.images} />
          </Pressable>

          {subject.poll ? (
            <PostPollView postId={subject.id} poll={subject.poll} canVote={isAuthenticated} />
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={openDetail} hitSlop={6}>
              <Ionicons name="chatbubble-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>{subject.replyCount}</Text>
            </Pressable>

            <Pressable style={styles.action} onPress={toggleRepost} disabled={!isAuthenticated} hitSlop={6}>
              <Ionicons name="repeat" size={16} color={reposted ? colors.success : colors.textSecondary} />
              <Text style={[styles.actionText, { color: reposted ? colors.success : colors.textSecondary }]}>
                {repostCount}
              </Text>
            </Pressable>

            <Pressable style={styles.action} onPress={toggleLike} disabled={!isAuthenticated} hitSlop={6}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={16}
                color={liked ? colors.error : colors.textSecondary}
              />
              <Text style={[styles.actionText, { color: liked ? colors.error : colors.textSecondary }]}>
                {likeCount}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {canReport ? (
        <ReportActionSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          entityType="post"
          entityId={subject.id}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  contextText: {
    fontSize: FontSize.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  handle: {
    fontSize: FontSize.xs,
  },
  moreButton: {
    paddingLeft: Spacing.sm,
  },
  content: {
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxl,
    marginTop: Spacing.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.xs,
  },
});
