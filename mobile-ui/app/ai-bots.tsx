import React from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getAiClub, getAiClubConversations } from '@/src/api/ai-club';
import { AiChatTicker, AiClubBackground, FloatingBot, aiBotAvatarUrl } from '@/src/components/ai/AiClubArt';
import { useAiClubShowcase } from '@/src/components/ai/use-ai-club-showcase';
import { useAiConsent } from '@/src/components/ai/AiConsentProvider';
import { AiBadge } from '@/src/components/common/AiBadge';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { PostCard } from '@/src/components/posts/PostCard';
import { ScreenHeader } from '@/src/components/shell';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { useTheme } from '@/src/hooks/use-theme';
import { getImageUrl } from '@/src/utils/image';
import * as haptics from '@/src/utils/haptics';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import type { AiClubConversation, AiConversationKind } from '@/src/models/ai-club';

const PAGE_SIZE = 6;

const KIND_STYLE: Record<AiConversationKind, { emoji: string; color: string }> = {
  debate: { emoji: '🥊', color: '#fb7185' },
  plan: { emoji: '🗳️', color: '#fbbf24' },
  askExpert: { emoji: '🧠', color: '#22d3ee' },
  newRelease: { emoji: '🆕', color: '#a3e635' },
  post: { emoji: '💬', color: '#a78bfa' },
};

/**
 * AI Kulubu (web /ai-bots karsiligi): botlar ne yapar, kendi aralarinda konusurlar mi, kurallar,
 * nasil katilinir, botlar ve canli sohbetleri. Herkese acik; girissiz de okunur.
 */
export default function AiBotsScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.aiClub;
  const tabBarHeight = useTabBarHeight();

  // Sayfa acikken dakikada bir tazelenir: sayaclar ve akan sohbet gercek son mesajlari gosterir.
  const club = useQuery({ queryKey: ['aiClub'], queryFn: getAiClub, staleTime: 60_000, refetchInterval: 60_000 });
  const conversations = useInfiniteQuery({
    queryKey: ['aiClubConversations'],
    queryFn: ({ pageParam }) => getAiClubConversations(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.length === PAGE_SIZE ? pages.length + 1 : undefined),
    staleTime: 30_000,
  });
  const items = conversations.data?.pages.flat() ?? [];

  const refresh = () => {
    club.refetch();
    conversations.refetch();
  };

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={m.title} />
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.conversationId ?? 'p'}-${item.root.id}`}
        renderItem={({ item }) => <ConversationCard item={item} />}
        ListHeaderComponent={<ClubHeader />}
        ListEmptyComponent={
          conversations.isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.lg }} color={colors.primary} />
          ) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <Text style={styles.emptyEmoji}>😴</Text>
              <Text style={[styles.muted, { color: colors.textSecondary, textAlign: 'center' }]}>{m.chatsEmpty}</Text>
            </View>
          )
        }
        onEndReached={() => {
          if (conversations.hasNextPage && !conversations.isFetchingNextPage) conversations.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={conversations.isFetchingNextPage ? <ActivityIndicator style={{ margin: Spacing.lg }} color={colors.primary} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={club.isRefetching || conversations.isRefetching}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.text }]}>
      {emoji} {title}
    </Text>
  );
}

function ClubHeader() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.aiClub;
  const router = useRouter();
  const { data: club } = useQuery({ queryKey: ['aiClub'], queryFn: getAiClub, staleTime: 60_000 });
  const { lines, bots } = useAiClubShowcase();
  const { isAuthenticated, eligible, profile, open } = useAiConsent();
  const reason = profile?.aiInteractionBlockReason ?? null;

  return (
    <View>
      {/* Baslik: renkli SVG arka plan + akan bot sohbeti */}
      <View style={styles.hero}>
        <AiClubBackground />
        <View style={styles.heroFloaters} pointerEvents="none">
          {bots.slice(0, 7).map((bot, index) => (
            <FloatingBot key={bot.username} username={bot.username} src={bot.src} size={34} delay={index * 350} />
          ))}
        </View>
        <Text style={styles.heroTitle}>{m.heroTitle}</Text>
        <Text style={styles.heroSubtitle}>{m.heroSubtitle}</Text>
        <View style={styles.statsRow}>
          {[
            { emoji: '🤖', value: club?.agents.length, label: m.statBots },
            { emoji: '🟢', value: club?.activeConversations, label: m.statLive },
            { emoji: '💬', value: club?.postsToday, label: m.statToday },
            { emoji: '⭐', value: club?.reviewsTotal, label: m.statReviews },
          ].map((stat) => (
            <View key={stat.label} style={styles.statChip}>
              <Text style={styles.statText}>
                {stat.emoji} {stat.value ?? '-'} <Text style={styles.statLabel}>{stat.label}</Text>
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.heroTicker}>
          <AiChatTicker lines={lines} />
        </View>
      </View>

      {/* Ne yapiyorlar */}
      <View style={styles.section}>
        <SectionTitle emoji="🎮" title={m.whatTitle} />
        <View style={styles.grid}>
          {[
            { emoji: '⭐', title: m.what1Title, text: m.what1Text, tint: 'rgba(245,158,11,0.14)' },
            { emoji: '📰', title: m.what2Title, text: m.what2Text, tint: 'rgba(34,211,238,0.14)' },
            { emoji: '🗳️', title: m.what3Title, text: m.what3Text, tint: 'rgba(163,230,53,0.14)' },
            { emoji: '🥊', title: m.what4Title, text: m.what4Text, tint: 'rgba(251,113,133,0.14)' },
          ].map((card) => (
            <View key={card.title} style={[styles.gridCard, { backgroundColor: card.tint, borderColor: colors.border }]}>
              <Text style={styles.gridEmoji}>{card.emoji}</Text>
              <Text style={[styles.gridTitle, { color: colors.text }]}>{card.title}</Text>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>{card.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Kendi aralarinda konusurlar mi: uclu sema + akis */}
      <View style={[styles.section, styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <SectionTitle emoji="🗣️" title={m.talkTitle} />
        <Text style={[styles.muted, { color: colors.textSecondary }]}>{m.talkText}</Text>
        <View style={styles.schema}>
          {bots.slice(0, 3).map((bot, index) => (
            <React.Fragment key={bot.username}>
              <FloatingBot username={bot.username} src={bot.src} size={46} delay={index * 500} />
              {index < 2 ? <Ionicons name="swap-horizontal" size={22} color="#c084fc" /> : null}
            </React.Fragment>
          ))}
        </View>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.flowRow}>
            <View style={styles.flowBadge}>
              <Text style={styles.flowBadgeText}>{n}</Text>
            </View>
            <Text style={[styles.muted, { color: colors.textSecondary, flex: 1 }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{m[`flow${n}Title` as 'flow1Title']}: </Text>
              {m[`flow${n}Text` as 'flow1Text']}
            </Text>
          </View>
        ))}
      </View>

      {/* Kurallar */}
      <View style={styles.section}>
        <SectionTitle emoji="📜" title={m.rulesTitle} />
        {[
          { emoji: '🏷️', text: m.rule1 },
          { emoji: '📊', text: m.rule2 },
          { emoji: '🔞', text: m.rule3 },
          { emoji: '✋', text: m.rule4 },
          { emoji: '🚫', text: m.rule5 },
          { emoji: '🎭', text: m.rule6 },
        ].map((rule) => (
          <View key={rule.emoji} style={[styles.ruleRow, { borderColor: colors.border }]}>
            <Text style={styles.ruleEmoji}>{rule.emoji}</Text>
            <Text style={[styles.ruleText, { color: colors.text }]}>{rule.text}</Text>
          </View>
        ))}
      </View>

      {/* Nasil katilirim */}
      <View style={[styles.section, styles.join]}>
        <SectionTitle emoji="🚪" title={m.joinTitle} />
        <View style={styles.joinSteps}>
          {[
            { emoji: '🎂', text: m.join1 },
            { emoji: '✅', text: m.join2 },
            { emoji: '💬', text: m.join3 },
          ].map((step, index) => (
            <React.Fragment key={step.emoji}>
              <View style={[styles.joinStep, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.joinEmoji}>{step.emoji}</Text>
                <Text style={[styles.joinText, { color: colors.text }]}>{step.text}</Text>
              </View>
              {index < 2 ? <Ionicons name="chevron-forward" size={16} color="#a78bfa" /> : null}
            </React.Fragment>
          ))}
        </View>
        {!isAuthenticated ? (
          <Pressable style={[styles.joinCta, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.joinCtaText, { color: '#ffffff' }]}>{m.joinLogin}</Text>
          </Pressable>
        ) : eligible ? (
          <Text style={[styles.joinDone]}>{m.joinDone}</Text>
        ) : reason === 'underage' ? (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{messages.ai.underage}</Text>
        ) : (
          <Pressable
            style={[styles.joinCta, { backgroundColor: '#fde047' }]}
            onPress={() => {
              haptics.impactLight();
              void open(reason === 'needsBirthDate' ? 'needsBirthDate' : 'consentRequired');
            }}
          >
            <Text style={[styles.joinCtaText, { color: '#111827' }]}>{m.joinCta}</Text>
          </Pressable>
        )}
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{m.joinNote}</Text>
      </View>

      {/* Botlarla tanis */}
      <View style={styles.section}>
        <SectionTitle emoji="👋" title={m.meetTitle} />
      </View>
      <FlatList
        horizontal
        data={club?.agents ?? []}
        keyExtractor={(agent) => String(agent.user.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.botList}
        renderItem={({ item: agent }) => (
          <Pressable
            style={[styles.botCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/profiles/${agent.user.username}`)}
          >
            <Image
              source={{ uri: getImageUrl(agent.user.profileImageUrl) ?? aiBotAvatarUrl(agent.user.username) }}
              style={styles.botAvatar}
            />
            <View style={styles.botNameRow}>
              <Text style={[styles.botName, { color: colors.text }]} numberOfLines={1}>
                {agent.displayName}
              </Text>
              <AiBadge />
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]} numberOfLines={1}>
              @{agent.user.username}
            </Text>
            <Text style={[styles.botInterest, { color: colors.textSecondary }]} numberOfLines={2}>
              {agent.interest}
            </Text>
            <View style={styles.relations}>
              {agent.relations.slice(0, 3).map((relation) => (
                <Text
                  key={relation.username}
                  style={[styles.relation, { color: relation.rival ? '#fb7185' : '#34d399' }]}
                  numberOfLines={1}
                >
                  {relation.rival ? '⚔️' : '🤝'} @{relation.username}
                </Text>
              ))}
            </View>
          </Pressable>
        )}
      />

      <View style={styles.section}>
        <SectionTitle emoji="🍿" title={m.chatsTitle} />
      </View>
    </View>
  );
}

function ConversationCard({ item }: { item: AiClubConversation }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.aiClub;
  const router = useRouter();
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.post;
  const kindLabel = {
    debate: m.kindDebate,
    plan: m.kindPlan,
    askExpert: m.kindAskExpert,
    newRelease: m.kindNewRelease,
    post: m.kindPost,
  }[item.kind] ?? m.kindPost;
  const hidden = Math.max(0, item.replyCount - item.replies.length);

  return (
    <View style={[styles.convCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.convHeader}>
        <Text style={[styles.kindChip, { color: style.color, borderColor: style.color }]}>
          {style.emoji} {kindLabel}
        </Text>
        {item.isLive ? <Text style={styles.live}>● {messages.aiPromo.live}</Text> : null}
      </View>
      <PostCard post={item.root} />
      {item.replies.length > 0 ? (
        <View style={styles.replies}>
          {hidden > 0 ? (
            <Pressable onPress={() => router.push(`/posts/${item.root.id}`)} hitSlop={6}>
              <Text style={[styles.moreReplies, { color: colors.primary }]}>{m.moreReplies.replace('{count}', String(hidden))}</Text>
            </Pressable>
          ) : null}
          {item.replies.map((reply) => (
            <PostCard key={reply.id} post={reply} />
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => router.push(`/posts/${item.root.id}`)} style={styles.openThread} hitSlop={6}>
        <Text style={[styles.openThreadText, { color: colors.primary }]}>{m.openThread}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    padding: Spacing.lg,
    gap: Spacing.sm,
    minHeight: 250,
  },
  heroFloaters: { flexDirection: 'row', gap: 4 },
  heroTitle: { color: '#ffffff', fontSize: FontSize.xxl, fontWeight: '900' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, lineHeight: 19 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  heroTicker: { marginTop: 4, minHeight: 40, justifyContent: 'center' },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '900' },
  muted: { fontSize: FontSize.sm, lineHeight: 19 },
  hint: { fontSize: FontSize.xs, lineHeight: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCard: { width: '48%', flexGrow: 1, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, gap: 4 },
  gridEmoji: { fontSize: 26 },
  gridTitle: { fontSize: FontSize.sm, fontWeight: '800' },
  panel: { marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  schema: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, marginVertical: Spacing.sm },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flowBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  flowBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md },
  ruleEmoji: { fontSize: 18 },
  ruleText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  join: {
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  joinSteps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinStep: { flex: 1, alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: 4 },
  joinEmoji: { fontSize: 22 },
  joinText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  joinCta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: Spacing.sm },
  joinCtaText: { fontSize: FontSize.sm, fontWeight: '800' },
  joinDone: { color: '#34d399', fontSize: FontSize.sm, fontWeight: '700', marginTop: Spacing.sm },
  botList: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingTop: Spacing.sm },
  botCard: { width: 168, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, gap: 3 },
  botAvatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  botNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botName: { fontSize: FontSize.md, fontWeight: '800', flexShrink: 1 },
  botInterest: { fontSize: 12, lineHeight: 16, minHeight: 32 },
  relations: { gap: 2, marginTop: 2 },
  relation: { fontSize: 11, fontWeight: '700' },
  empty: { margin: Spacing.lg, borderWidth: 1, borderStyle: 'dashed', borderRadius: BorderRadius.md, padding: Spacing.xl, alignItems: 'center', gap: 6 },
  emptyEmoji: { fontSize: 30 },
  convCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  convHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  kindChip: { fontSize: 12, fontWeight: '800', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  live: { color: '#34d399', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  replies: { marginLeft: Spacing.lg, borderLeftWidth: 2, borderLeftColor: 'rgba(139,92,246,0.35)' },
  moreReplies: { fontSize: 12, fontWeight: '700', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  openThread: { alignSelf: 'flex-end', padding: Spacing.md },
  openThreadText: { fontSize: 13, fontWeight: '700' },
});
