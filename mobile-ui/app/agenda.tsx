import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { EmptyState } from '@/src/components/common/EmptyState';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { SegmentedTabs } from '@/src/components/common/SegmentedTabs';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { GameCard } from '@/src/components/discover/GameCard';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { gameApi } from '@/src/api/game';
import { calendarMonthName, formatCalendarDate } from '@/src/utils/date';
import * as haptics from '@/src/utils/haptics';
import type { Game } from '@/src/models/game';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

type AgendaTab = 'upcoming' | 'released';

type Row =
  | { type: 'date'; key: string; label: string }
  | { type: 'game'; key: string; game: Game }
  | { type: 'highlights'; key: string; games: Game[] }
  | { type: 'sectionTitle'; key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

interface PickerOption {
  label: string;
  value: number;
}

/** FilterBar'daki PickerSheet deseninin sayisal degerli kopyasi (ay/yil secimi). */
function ValuePickerSheet({
  visible,
  onClose,
  title,
  options,
  selected,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <FlatList
        data={options}
        keyExtractor={(item) => String(item.value)}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.optionItem,
              item.value === selected && { backgroundColor: `${colors.primary}15` },
            ]}
            onPress={() => {
              haptics.selection();
              onSelect(item.value);
              onClose();
            }}
          >
            <Text
              style={[
                styles.optionText,
                { color: item.value === selected ? colors.primary : colors.text },
              ]}
            >
              {item.label}
            </Text>
            {item.value === selected && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </Pressable>
        )}
      />
    </BottomSheet>
  );
}

export default function AgendaScreen() {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const tabBarHeight = useTabBarHeight();

  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [tab, setTab] = useState<AgendaTab>('upcoming');
  const [activePicker, setActivePicker] = useState<'month' | 'year' | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['agenda', year, month],
    queryFn: () => gameApi.agenda(year, month),
    staleTime: 15 * 60 * 1000,
  });

  const games = tab === 'upcoming' ? (data?.upcoming ?? []) : (data?.released ?? []);

  // Ayni gun (Tum Yil modunda ayni ay) cikan oyunlar tek baslik altinda toplanir;
  // API siralamasi korunur.
  const isYearView = month === 0;
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];

    // Vitrin: backend populerlige gore seciyor (tarih sirasi degil), web ile ayni veri.
    const highlights = data?.highlights ?? [];
    if (highlights.length > 0) {
      out.push({ type: 'highlights', key: 'highlights', games: highlights });
    }

    let lastKey: string | null = null;
    for (const game of games) {
      const date = game.released ?? '';
      const key = isYearView ? date.slice(0, 7) : date;
      if (key !== lastKey) {
        lastKey = key;
        const [y, m, d] = date.split('-').map(Number);
        const label = !y
          ? messages.common.tba
          : isYearView
            ? `${calendarMonthName(m, locale)} ${y}`
            : formatCalendarDate(y, m, d, locale);
        out.push({ type: 'date', key: `d-${key}`, label });
      }
      out.push({ type: 'game', key: `g-${game.id}`, game });
    }

    // Tarihi aciklanmamis buyuk beklenenler (yalnizca Tum Yil gorunumunde dolu gelir).
    const tba = data?.tba ?? [];
    if (isYearView && tba.length > 0) {
      out.push({
        type: 'sectionTitle',
        key: 'tba-title',
        label: messages.agenda.tbaTitle,
        icon: 'hourglass-outline',
      });
      for (const game of tba) {
        out.push({ type: 'game', key: `tba-${game.id}`, game });
      }
    }

    return out;
  }, [games, locale, messages.common.tba, messages.agenda.tbaTitle, isYearView, data]);

  const monthOptions: PickerOption[] = [
    { value: 0, label: messages.agenda.allYear },
    ...Array.from({ length: 12 }, (_, index) => ({
      value: index + 1,
      label: calendarMonthName(index + 1, locale),
    })),
  ];
  // Geriye 1 yil, ileriye 2 yil: gundemin dogal penceresi (web ile ayni).
  const yearOptions: PickerOption[] = Array.from({ length: 4 }, (_, index) => ({
    value: currentYear - 1 + index,
    label: String(currentYear - 1 + index),
  }));

  if (isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.nav.screenTitles.agenda} />

      {/* Ay + yil secici cipleri */}
      <View style={styles.controls}>
        <Pressable
          style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            haptics.selection();
            setActivePicker('month');
          }}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.chipText, { color: colors.text }]}>
            {isYearView ? messages.agenda.allYear : calendarMonthName(month, locale)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            haptics.selection();
            setActivePicker('year');
          }}
        >
          <Text style={[styles.chipText, { color: colors.text }]}>{year}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.tabsWrap}>
        <SegmentedTabs<AgendaTab>
          tabs={[
            { key: 'upcoming', label: messages.agenda.upcoming },
            { key: 'released', label: messages.agenda.released },
          ]}
          activeKey={tab}
          onChange={(key) => setTab(key)}
        />
      </View>

      {isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={messages.agenda.loadError}
          action={
            <Pressable onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.primary }]}>
                {messages.common.retry}
              </Text>
            </Pressable>
          }
        />
      ) : (
        <FlatList
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          data={rows}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return <Text style={[styles.dateHeader, { color: colors.textSecondary }]}>{item.label}</Text>;
            }
            if (item.type === 'sectionTitle') {
              return (
                <View style={styles.sectionTitleRow}>
                  <Ionicons name={item.icon} size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{item.label}</Text>
                </View>
              );
            }
            if (item.type === 'highlights') {
              return (
                <View style={styles.highlightsWrap}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="flame" size={18} color={colors.warning ?? colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {messages.agenda.highlights}
                    </Text>
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={item.games}
                    keyExtractor={(g) => `hl-${g.id}`}
                    contentContainerStyle={styles.highlightsList}
                    renderItem={({ item: game }) => (
                      <View style={styles.highlightCard}>
                        <GameCard game={game} variant="compact" />
                      </View>
                    )}
                  />
                </View>
              );
            }
            return <GameCard game={item.game} variant="list" />;
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + Spacing.md }]}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={tab === 'upcoming' ? messages.agenda.emptyUpcoming : messages.agenda.emptyReleased}
            />
          }
        />
      )}

      <ValuePickerSheet
        visible={activePicker === 'month'}
        onClose={() => setActivePicker(null)}
        title={messages.agenda.month}
        options={monthOptions}
        selected={month}
        onSelect={setMonth}
      />
      <ValuePickerSheet
        visible={activePicker === 'year'}
        onClose={() => setActivePicker(null)}
        title={messages.agenda.year}
        options={yearOptions}
        selected={year}
        onSelect={setYear}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tabsWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  dateHeader: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  highlightsWrap: {
    marginBottom: Spacing.md,
  },
  highlightsList: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  highlightCard: {
    width: 230,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  optionText: {
    fontSize: FontSize.md,
  },
});
