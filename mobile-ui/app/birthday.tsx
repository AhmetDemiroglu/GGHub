import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { BirthdayCake } from '@/src/components/birthday/BirthdayCake';
import { Confetti } from '@/src/components/birthday/Confetti';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { getMyBirthday } from '@/src/api/profile';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

/**
 * "2026-07-18" -> "18 Temmuz 2026".
 *
 * DIKKAT: new Date("2026-07-18") UTC gece yarisi olarak parse edilir ve negatif offsetli
 * bir saat diliminde bir onceki gunu yazar. Parcalari ELLE veriyoruz.
 */
function formatCelebrationDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString(
    locale === 'tr' ? 'tr-TR' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}

/**
 * Kisiye ozel dogum gunu kutlama ekrani.
 *
 * Route'ta kullanici kimligi YOK: sunucu veriyi yalnizca token'dan cozer, dolayisiyla
 * baskasinin kutlamasini gormek yapisal olarak imkansiz.
 */
export default function BirthdayScreen() {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const tabBarHeight = useTabBarHeight();
  const isFocused = useIsFocused();
  const bp = messages.birthdayPage;

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-birthday'],
    queryFn: getMyBirthday,
    enabled: isAuthenticated,
    // 404 "dogum tarihi kayitli degil" demek, gecici bir hata degil: tekrar denenmez.
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data?.isToday) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [data?.isToday]);

  if (!isAuthenticated) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={messages.nav.screenTitles.birthday} />
        <EmptyState icon="lock-closed-outline" title={bp.loginRequired} description={bp.loginDescription} />
      </ScreenWrapper>
    );
  }

  if (isLoading) return <LoadingScreen />;

  if (error) {
    const notFound = isAxiosError(error) && error.response?.status === 404;

    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={messages.nav.screenTitles.birthday} />
        <EmptyState
          icon={notFound ? 'gift-outline' : 'alert-circle-outline'}
          title={notFound ? bp.emptyTitle : bp.errorTitle}
          description={notFound ? bp.emptyDescription : bp.errorDescription}
        />
      </ScreenWrapper>
    );
  }

  if (!data) return null;

  const heading = (data.isToday ? bp.title : bp.pastTitle).replace('{name}', data.displayName);
  const subtitle = data.isToday ? bp.subtitle : bp.pastSubtitle;

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.nav.screenTitles.birthday} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <BirthdayCake />

        <Text style={[styles.heading, { color: colors.text }]}>{heading}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

        <View style={[styles.dateChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="gift-outline" size={16} color={colors.accent} />
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{bp.dateLabel}:</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>
            {formatCelebrationDate(data.celebrationDate, locale)}
          </Text>
        </View>
      </ScrollView>

      {/* Konfeti EN USTTE ve dokunmalari gecirir; ekran blur olunca durur. */}
      <Confetti active={data.isToday && isFocused} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 320,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xl,
  },
  dateLabel: {
    fontSize: FontSize.sm,
  },
  dateValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
