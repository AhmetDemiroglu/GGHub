import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { PlatformIcons } from '@/src/components/common/PlatformIcons';
import { ScorePillRow } from '@/src/components/common/ScorePill';
import { HorizontalScrollGuard } from '@/src/components/home/HorizontalScrollGuard';
import * as haptics from '@/src/utils/haptics';
import type { HomeGame } from '@/src/models/home';
import { AiClubPromoCard } from '@/src/components/home/AiClubPromoCard';

/** Ilk kart her zaman AI Kulubu tanitimi, ardindan oyunlar. */
type HeroItem = { kind: 'ai' } | { kind: 'game'; game: HomeGame };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const ITEM_HEIGHT = 200;
const AUTO_SCROLL_INTERVAL = 5000;

interface HeroSliderProps {
  games: HomeGame[];
}

export function HeroSlider({ games }: HeroSliderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const flatListRef = useRef<FlatList<HeroItem>>(null);
  const items: HeroItem[] = React.useMemo(
    () => [{ kind: 'ai' as const }, ...games.map((game) => ({ kind: 'game' as const, game }))],
    [games],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const startAutoScroll = useCallback(() => {
    // Once eskisi temizlenir: surukle-birak sonu ve dokunus sonu ikisi de baslatiyor, iki
    // zamanlayici ust uste binerse kart iki kat sik kayardi.
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (items.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [items.length]);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    startAutoScroll();
    return stopAutoScroll;
  }, [startAutoScroll, stopAutoScroll]);

  const handleScrollBeginDrag = () => stopAutoScroll();
  const handleScrollEndDrag = () => startAutoScroll();

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(
    ({ item: heroItem }: { item: HeroItem }) => {
      if (heroItem.kind === 'ai') {
        return <AiClubPromoCard width={ITEM_WIDTH} height={ITEM_HEIGHT} />;
      }
      const item = heroItem.game;
      const imageUri = getImageUrl(item.backgroundImage);

      return (
        <Pressable
          style={[styles.card, { width: ITEM_WIDTH }]}
          onPress={() => {
            haptics.impactLight();
            router.push(`/game/${item.slug}`);
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.surface }]} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.5, 1]}
            style={styles.gradient}
            pointerEvents="none"
          />
          <View style={styles.overlay}>
            <View style={styles.bottomRow}>
              <View style={styles.nameContainer}>
                <Text style={styles.gameName} numberOfLines={2}>
                  {item.name}
                </Text>
                <PlatformIcons platforms={item.platforms} size={14} color="#ffffff" maxIcons={4} />
                <View style={styles.scoreShell}>
                  <ScorePillRow
                    metacritic={item.metacriticScore}
                    rawg={item.rawgRating}
                    gghub={item.gghubRating > 0 ? item.gghubRating : null}
                    gghubCount={item.gghubRatingCount}
                    igdb={item.igdbRating}
                    size="sm"
                    gap={6}
                  />
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    [colors.surface, router],
  );


  return (
    <View style={styles.container}>
      <HorizontalScrollGuard>
        <FlatList
          ref={flatListRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => (item.kind === 'ai' ? 'hero-ai-club' : `hero-${item.game.rawgId}`)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH + Spacing.md}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          // Parmak karttayken otomatik kaydirma durur. Aksi halde okuyup dokunan kullanicinin ilk
          // dokunusu tam o an baslayan kaydirma animasyonunu durdurmaya gidiyor, kart acilmiyordu.
          onTouchStart={stopAutoScroll}
          onTouchEnd={startAutoScroll}
          onTouchCancel={startAutoScroll}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: ITEM_WIDTH + Spacing.md,
            offset: (ITEM_WIDTH + Spacing.md) * index,
            index,
          })}
        />
      </HorizontalScrollGuard>
      {items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? colors.primary : colors.textMuted,
                  width: index === activeIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    height: ITEM_HEIGHT,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.sm,
  },
  scoreShell: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.md,
  },
  gameName: {
    color: '#ffffff',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: 4,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
