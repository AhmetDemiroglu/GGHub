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
import { useTheme } from '@/src/hooks/use-theme';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { getImageUrl } from '@/src/utils/image';
import { PlatformIcons } from '@/src/components/common/PlatformIcons';
import { ScoreBadge } from '@/src/components/common/ScoreBadge';
import type { HomeGame } from '@/src/models/home';

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
  const flatListRef = useRef<FlatList<HomeGame>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const startAutoScroll = useCallback(() => {
    if (games.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % games.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
  }, [games.length]);

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
    ({ item }: { item: HomeGame }) => {
      const imageUri = getImageUrl(item.backgroundImage);

      return (
        <Pressable
          style={[styles.card, { width: ITEM_WIDTH }]}
          onPress={() => router.push(`/game/${item.slug}`)}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: colors.surface }]} />
          )}
          <View style={styles.gradient} />
          <View style={styles.overlay}>
            <View style={styles.topRow}>
              {item.metacriticScore != null && (
                <ScoreBadge score={item.metacriticScore} size="sm" />
              )}
            </View>
            <View style={styles.bottomRow}>
              <View style={styles.nameContainer}>
                <Text style={styles.gameName} numberOfLines={2}>
                  {item.name}
                </Text>
                <PlatformIcons platforms={item.platforms} size={14} color="#ffffff" maxIcons={4} />
              </View>
              {item.gghubRating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.ratingText}>{item.gghubRating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [colors.surface, router],
  );

  if (!games.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={games}
        renderItem={renderItem}
        keyExtractor={(item) => `hero-${item.rawgId}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH + Spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH + Spacing.md,
          offset: (ITEM_WIDTH + Spacing.md) * index,
          index,
        })}
      />
      {games.length > 1 && (
        <View style={styles.pagination}>
          {games.map((_, index) => (
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
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
    gap: Spacing.xs,
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
