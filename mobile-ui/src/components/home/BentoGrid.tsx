import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';
import { TrendingGames } from './TrendingGames';
import { LeaderboardCard } from './LeaderboardCard';
import type { HomeGame, LeaderboardUser } from '@/src/models/home';

interface BentoGridProps {
  trendingGames: HomeGame[];
  leaderboard: LeaderboardUser[];
  showJoinCta: boolean;
}

export function BentoGrid({ trendingGames, leaderboard, showJoinCta }: BentoGridProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TrendingGames games={trendingGames} />
      <LeaderboardCard users={leaderboard} />

      {showJoinCta && (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ctaCard, Shadows.md]}
        >
          <Ionicons name="game-controller" size={32} color="#ffffff" />
          <Text style={styles.ctaTitle}>{messages.home.joinCta}</Text>
          <Text style={styles.ctaDescription}>{messages.home.joinDescription}</Text>
          <Pressable
            style={styles.ctaButton}
            onPress={() => {
              haptics.impactLight();
              router.push('/(auth)/register');
            }}
          >
            <Text style={styles.ctaButtonText}>{messages.home.signUp}</Text>
          </Pressable>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  ctaCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  ctaTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: '#ffffff',
  },
  ctaDescription: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  ctaButtonText: {
    color: '#6366f1',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
