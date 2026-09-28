import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AiBadge } from '@/src/components/common/AiBadge';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAiConsent } from '@/src/components/ai/AiConsentProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/common/Avatar';
import { useUserLink } from '@/src/components/common/UserLink';
import { useToast } from '@/src/components/common/Toast';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import { followUser, unfollowUser } from '@/src/api/social';
import { HorizontalScrollGuard } from '@/src/components/home/HorizontalScrollGuard';
import { displayName } from '@/src/utils/display-name';
import type { SuggestedUser } from '@/src/models/social';
import * as haptics from '@/src/utils/haptics';

interface PeopleYouMayKnowProps {
  suggestions: SuggestedUser[];
  /** Takip edilmeyen botlar. Kisilerin arasina karisik dizilir; takipleri AI rizasi ister. */
  agents?: SuggestedUser[];
}

const BOT_VIOLET = '#8b5cf6';

/**
 * Tek serit, karisik: her iki kisiden sonra bir bot, artan botlar sona. Mobilde alani ikiye
 * bolmek kartlari daraltir, alt alta iki serit de akisi asagi iter.
 */
function interleave(people: SuggestedUser[], bots: SuggestedUser[]) {
  const result: SuggestedUser[] = [];
  let b = 0;
  people.forEach((person, index) => {
    result.push(person);
    if (index % 2 === 1 && b < bots.length) result.push(bots[b++]);
  });
  return result.concat(bots.slice(b));
}

const CARD_WIDTH = 150;

/** Takip onayinin ("Takipte") kart cikmadan once ekranda kaldigi sure. */
const REMOVAL_DELAY_MS = 450;

export function PeopleYouMayKnow({ suggestions, agents = [] }: PeopleYouMayKnowProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { ensure, eligible, profile } = useAiConsent();
  const { messages } = useLocale();
  const { canOpen, openProfile } = useUserLink();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const pymk = messages.home.pymk;

  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [followState, setFollowState] = useState<Record<number, boolean>>({});
  const [pending, setPending] = useState<Set<number>>(new Set());

  const followMutation = useMutation({ mutationFn: (username: string) => followUser(username) });
  const unfollowMutation = useMutation({ mutationFn: (username: string) => unfollowUser(username) });

  const removalTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const timers = removalTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  /**
   * Takip edilen kisi oneri havuzundan dusmeli. Yerel bir "gizle" set'i YETMEZ:
   * ana sayfa unmount olunca sifirlanir ve 5dk staleTime yuzunden cache'teki
   * ayni kisi geri gelirdi. Bu yuzden kayit sorgu cache'inden cikarilir; kart
   * agactan dusunce Animated.View'in exiting animasyonu kendiliginden oynar.
   * Anahtar app/(tabs)/index.tsx'teki useQuery ile ayni olmali.
   */
  const removeFromSuggestions = useCallback(
    (id: number) => {
      for (const key of ['suggestedUsers', 'suggestedAgents']) {
        queryClient.setQueryData<SuggestedUser[]>([key], (old) =>
          old ? old.filter((u) => u.id !== id) : old,
        );
      }
    },
    [queryClient],
  );

  const handleToggleFollow = useCallback(
    async (item: SuggestedUser) => {
      if (pending.has(item.id)) return;
      const isFollowing = followState[item.id] ?? item.isFollowing;
      haptics.impactLight();

      if (item.isAiAgent && !isFollowing) {
        // Bot takibi AI rizasi ister. Iyimser guncelleme YOK: pencerede vazgecilirse buton
        // "Takipte"ye donup geri gelmesin. Profil yuklenmemisse istek yine gider; sunucu 403
        // ai_consent_required doner ve client.ts pencereyi acar.
        if (profile && !eligible && !(await ensure())) return;
        setPending((prev) => new Set(prev).add(item.id));
        try {
          await followMutation.mutateAsync(item.username);
          setFollowState((prev) => ({ ...prev, [item.id]: true }));
          removalTimers.current[item.id] = setTimeout(
            () => removeFromSuggestions(item.id),
            REMOVAL_DELAY_MS,
          );
        } catch (error) {
          if (!(error as { isAiConsentDeclined?: boolean }).isAiConsentDeclined) {
            showToast('error', pymk.followError);
          }
        } finally {
          setPending((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }
        return;
      }

      // İyimser güncelleme: arayüzü hemen çevir, hata olursa geri al.
      setFollowState((prev) => ({ ...prev, [item.id]: !isFollowing }));
      setPending((prev) => new Set(prev).add(item.id));

      try {
        if (isFollowing) {
          // Onay penceresinde (kart daha cikmadan) geri alinabilir: bekleyen
          // cikarma iptal edilmezse takipten cikilmasina ragmen kart giderdi.
          const timer = removalTimers.current[item.id];
          if (timer) {
            clearTimeout(timer);
            delete removalTimers.current[item.id];
          }
          await unfollowMutation.mutateAsync(item.username);
        } else {
          await followMutation.mutateAsync(item.username);
          // Once "Takipte" gorunsun ki eylemin ulastigi anlasilsin, sonra kart aksin.
          removalTimers.current[item.id] = setTimeout(
            () => removeFromSuggestions(item.id),
            REMOVAL_DELAY_MS,
          );
        }
      } catch {
        setFollowState((prev) => ({ ...prev, [item.id]: isFollowing }));
        showToast('error', pymk.followError);
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [
      followState,
      pending,
      followMutation,
      unfollowMutation,
      removeFromSuggestions,
      showToast,
      pymk,
      profile,
      eligible,
      ensure,
    ],
  );

  const reasonLabel = useCallback(
    (item: SuggestedUser): { icon: keyof typeof Ionicons.glyphMap; text: string; color: string } => {
      if (item.followsYou) {
        return { icon: 'person-add', text: pymk.followsYou, color: colors.success };
      }
      if (item.reason === 'mutual' && item.mutualFollowerCount > 0) {
        return { icon: 'people', text: pymk.mutual.replace('{count}', String(item.mutualFollowerCount)), color: colors.primary };
      }
      if (item.reason === 'taste' && item.sharedGameCount > 0) {
        return { icon: 'game-controller', text: pymk.taste.replace('{count}', String(item.sharedGameCount)), color: colors.star };
      }
      return { icon: 'flame', text: pymk.popular, color: colors.textSecondary };
    },
    [pymk, colors],
  );

  const renderItem = useCallback(
    ({ item }: { item: SuggestedUser }) => {
      const isFollowing = followState[item.id] ?? item.isFollowing;
      const name = displayName(item);
      const reason = reasonLabel(item);
      const isPending = pending.has(item.id);
      const profileOpenable = canOpen(item);
      const bot = !!item.isAiAgent;
      const gradientButton = bot && !isFollowing;

      return (
        <Animated.View
          exiting={FadeOut.duration(220)}
          layout={LinearTransition.duration(220)}
          style={[
            styles.card,
            { backgroundColor: colors.surface },
            bot && styles.botCard,
            Shadows.sm,
          ]}
        >
          {bot ? (
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.20)', 'rgba(217, 70, 239, 0.06)', 'rgba(139, 92, 246, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.botTint}
              pointerEvents="none"
            />
          ) : null}
          <Pressable
            style={styles.dismissBtn}
            hitSlop={8}
            onPress={() => setDismissed((prev) => new Set(prev).add(item.id))}
          >
            <Ionicons name="close" size={14} color={colors.textSecondary} />
          </Pressable>

          {/*
            `disabled` YOK, bilerek. Backend "Followers" gorunurluklu hesaplari
            oneri havuzunda BILEREK tutuyor (UserSuggestionService), ama aday
            havuzu zaten takip ettiklerini eledigi icin bu kisilerde
            IsProfileAccessible HER ZAMAN false olur. Eskiden kart bu yuzden
            digerleriyle birebir ayni gorunup hic tepki vermiyordu; artik kilit
            rozeti durumu gosteriyor ve dokunus nedenini soyluyor.
          */}
          <Pressable
            style={styles.cardTop}
            onPress={() => {
              haptics.impactLight();
              if (!profileOpenable) {
                showToast('info', pymk.privateHint);
                return;
              }
              openProfile(item);
            }}
          >
            {/* Kisi ve bot kartinda avatar kutusu ayni boyda (bot halkasi mor, kiside saydam): kartlar
                esit yukseklikte kalir, Takip Et butonlari ayni hizada durur. */}
            <View style={[styles.avatarRing, bot && styles.botAvatarRing]}>
              <Avatar uri={item.profileImageUrl} name={name} size={56} />
              {!profileOpenable ? (
                <View
                  style={[
                    styles.lockBadge,
                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.surface },
                  ]}
                >
                  <Ionicons name="lock-closed" size={9} color={colors.textMuted} />
                </View>
              ) : null}
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name}
              {item.isAiAgent ? <AiBadge /> : null}
            </Text>
            <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
              @{item.username}
            </Text>
          </Pressable>

          {/* Sabit yukseklikli bilgi alani: botta iki satirlik ilgi alani, kiside tek satirlik neden.
              Yukseklik ayni oldugu icin butonlar kartlar arasinda kaymaz. */}
          <View style={styles.infoBox}>
            {bot && item.tagline ? (
              <Text style={[styles.tagline, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.tagline}
              </Text>
            ) : (
              <View style={styles.reasonRow}>
                <Ionicons name={reason.icon} size={11} color={reason.color} />
                <Text style={[styles.reasonText, { color: reason.color }]} numberOfLines={1}>
                  {reason.text}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={[
              styles.followBtn,
              gradientButton
                ? { borderColor: 'transparent', overflow: 'hidden' }
                : isFollowing
                  ? { backgroundColor: 'transparent', borderColor: colors.border }
                  : { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            disabled={isPending}
            onPress={() => handleToggleFollow(item)}
          >
            {gradientButton ? (
              <LinearGradient
                colors={['#7c3aed', '#c026d3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            ) : null}
            {isPending ? (
              <ActivityIndicator
                size="small"
                color={gradientButton ? '#fff' : isFollowing ? colors.text : colors.background}
              />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'person-add'}
                  size={13}
                  color={gradientButton ? '#fff' : isFollowing ? colors.text : colors.background}
                />
                <Text
                  style={[
                    styles.followText,
                    { color: gradientButton ? '#fff' : isFollowing ? colors.text : colors.background },
                  ]}
                >
                  {isFollowing ? pymk.following : pymk.follow}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      );
    },
    [
      colors,
      followState,
      pending,
      reasonLabel,
      handleToggleFollow,
      canOpen,
      openProfile,
      pymk,
      showToast,
    ],
  );

  const people = suggestions.filter((s) => !dismissed.has(s.id));
  const bots = agents.filter((s) => !dismissed.has(s.id));
  const visible = interleave(people, bots);
  if (visible.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {pymk.title}
        </Text>
        {bots.length > 0 ? (
          <Pressable
            style={styles.clubLink}
            hitSlop={8}
            onPress={() => {
              haptics.impactLight();
              router.push('/ai-bots');
            }}
          >
            <Ionicons name="sparkles" size={12} color={BOT_VIOLET} />
            <Text style={styles.clubLinkText}>{pymk.botsLink}</Text>
            <Ionicons name="chevron-forward" size={12} color={BOT_VIOLET} />
          </Pressable>
        ) : null}
      </View>
      <HorizontalScrollGuard>
        <FlatList
          data={visible}
          renderItem={renderItem}
          keyExtractor={(item) => `pymk-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </HorizontalScrollGuard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    flexShrink: 1,
  },
  clubLink: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
  },
  clubLinkText: {
    color: BOT_VIOLET,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    // Dikey padding SART: Android'de elevation golgeyi view sinirinin DISINA
    // cizer, dikey padding olmadan yatay FlatList onu kirpiyor ve golge altta
    // aniden kesiliyordu. Kartin kendisinde overflow:'hidden' YOK, bu yuzden
    // golge iki platformda da dogru; tek eksik kirpma payiydi.
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    // Serit yuksekligi en uzun karta esitlenir (bot kartindaki iki satirlik ilgi alani);
    // takip butonu marginTop:'auto' ile hep alta yaslanir. flex:1 DEGIL (basis 0 olur, otomatik
    // yukseklikli hucrede kart cokebilir); flexGrow icerik boyundan baslayip buyur.
    flexGrow: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  botCard: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.40)',
  },
  botTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  botAvatarRing: {
    borderColor: 'rgba(139, 92, 246, 0.65)',
  },
  infoBox: {
    height: 30,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontSize: FontSize.xs,
    lineHeight: 15,
    textAlign: 'center',
  },
  dismissBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    padding: 2,
  },
  lockBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.sm,
    maxWidth: '100%',
  },
  handle: {
    fontSize: FontSize.xs,
    marginTop: 1,
    maxWidth: '100%',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '100%',
  },
  reasonText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    flexShrink: 1,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 7,
    width: '100%',
    marginTop: 'auto',
  },
  followText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
