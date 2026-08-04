import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';
import { StatsCard } from '@/src/components/admin/StatsCard';
import { BreakdownCard } from '@/src/components/admin/BreakdownCard';
import { DownloadFunnelCard } from '@/src/components/admin/DownloadFunnelCard';
import { DownloadTrendChart } from '@/src/components/admin/DownloadTrendChart';
import {
  downloadAnalyticsApi,
  type BreakdownDimension,
  type DownloadAnalyticsFilter,
} from '@/src/api/download-analytics';

/** Gun sayisindan ISO tarih araligi uretir (web'deki rangeFromDays ile ayni). */
function rangeFromDays(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

const RANGE_OPTIONS = [7, 30, 90] as const;
const PLATFORM_OPTIONS = ['all', 'ios', 'android', 'other'] as const;
const BREAKDOWNS: BreakdownDimension[] = ['channel', 'utmCampaign', 'platform', 'country', 'browser'];
const EVENT_PAGE_SIZE = 25;

/**
 * /download-app kampanya analitigi (mobil). Web'deki download-analytics
 * sayfasinin karsiligi: ayni uclar, ayni filtreler, ayni i18n anahtarlari.
 * Mobilde eksikti ve admin kampanya olcumlerini yalnizca web'den gorebiliyordu.
 */
export default function AdminDownloadAnalyticsScreen() {
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const d = messages.admin.downloadAnalytics;

  const [days, setDays] = useState<number>(30);
  const [platform, setPlatform] = useState<string>('all');
  const [includeBots, setIncludeBots] = useState(false);

  const filter: DownloadAnalyticsFilter = useMemo(
    () => ({
      ...rangeFromDays(days),
      platform: platform === 'all' ? undefined : platform,
      includeBots,
    }),
    [days, platform, includeBots],
  );

  // Sorgu anahtari filtrenin TAMAMINI icermeli, yoksa filtre degisince
  // onbellekten eski veri doner (web'de yasanan hatanin aynisi).
  const key = [filter.startDate, filter.endDate, filter.platform ?? 'all', includeBots];

  const summaryQuery = useQuery({
    queryKey: ['download-analytics', 'summary', ...key],
    queryFn: () => downloadAnalyticsApi.getSummary(filter),
    placeholderData: (prev) => prev,
  });

  const funnelQuery = useQuery({
    queryKey: ['download-analytics', 'funnel', ...key],
    queryFn: () => downloadAnalyticsApi.getFunnel(filter),
    placeholderData: (prev) => prev,
  });

  const seriesQuery = useQuery({
    queryKey: ['download-analytics', 'timeseries', ...key],
    queryFn: () => downloadAnalyticsApi.getTimeSeries(filter),
    placeholderData: (prev) => prev,
  });

  const eventsQuery = useQuery({
    queryKey: ['download-analytics', 'events', ...key],
    queryFn: () => downloadAnalyticsApi.getEvents({ ...filter, page: 1, pageSize: EVENT_PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const isLoading = summaryQuery.isLoading || funnelQuery.isLoading;
  const isError = summaryQuery.isError || funnelQuery.isError;
  const isRefreshing =
    summaryQuery.isFetching || funnelQuery.isFetching || seriesQuery.isFetching || eventsQuery.isFetching;

  const onRefresh = () => {
    summaryQuery.refetch();
    funnelQuery.refetch();
    seriesQuery.refetch();
    eventsQuery.refetch();
  };

  const platformLabel = (value: string) => {
    if (value === 'all') return d.allPlatforms;
    if (value === 'other') return 'Desktop';
    return value === 'ios' ? 'iOS' : 'Android';
  };

  const breakdownTitle = (dimension: BreakdownDimension) => {
    if (dimension === 'channel') return d.byChannel;
    if (dimension === 'utmCampaign') return d.byCampaign;
    if (dimension === 'platform') return d.byPlatform;
    if (dimension === 'country') return d.byCountry;
    return d.byBrowser;
  };

  if (isLoading) return <LoadingScreen />;

  const summary = summaryQuery.data;
  const funnel = funnelQuery.data;
  const events = eventsQuery.data?.items ?? [];

  return (
    <SwipeBackEdge>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>{d.description}</Text>

        {/* Filtreler */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{d.filterRange}</Text>
          <View style={styles.chipRow}>
            {RANGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  {
                    backgroundColor: days === option ? colors.primary : colors.surface,
                    borderColor: days === option ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setDays(option)}
              >
                <Text
                  style={[styles.chipText, { color: days === option ? '#ffffff' : colors.textSecondary }]}
                >
                  {option === 7 ? d.last7 : option === 30 ? d.last30 : d.last90}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterLabel, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            {d.platform}
          </Text>
          <View style={styles.chipRow}>
            {PLATFORM_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  {
                    backgroundColor: platform === option ? colors.primary : colors.surface,
                    borderColor: platform === option ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setPlatform(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: platform === option ? '#ffffff' : colors.textSecondary },
                  ]}
                >
                  {platformLabel(option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>{d.includeBots}</Text>
            <Switch
              value={includeBots}
              onValueChange={setIncludeBots}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
            />
          </View>
        </View>

        {isError ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.error }]}>
            <Text style={[styles.errorTitle, { color: colors.text }]}>{messages.admin.loadErrorTitle}</Text>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>{d.loadError}</Text>
          </View>
        ) : null}

        {summary ? (
          <>
            <View style={styles.statsGrid}>
              <StatsCard icon="eye" label={d.pageViews} value={summary.pageViews} color={colors.info} />
              <StatsCard
                icon="people"
                label={d.uniqueVisits}
                value={summary.uniqueVisits}
                color={colors.primary}
                description={d.uniqueVisitorsNote.replace(
                  '{count}',
                  summary.uniqueVisitors.toLocaleString(),
                )}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatsCard
                icon="bag-handle"
                label={d.storeReach}
                value={summary.autoRedirects + summary.storeClicks}
                color={colors.success}
                description={d.storeReachNote}
              />
              <StatsCard
                icon="trending-up"
                label={d.conversion}
                value={`${summary.storeReachRate}%`}
                color={colors.warning}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatsCard
                icon="bug"
                label={d.botTraffic}
                value={summary.botHits}
                color={colors.textMuted}
                description={d.botsFiltered}
              />
              <StatsCard
                icon="globe-outline"
                label={d.funnelWeb}
                value={summary.webClicks}
                color={colors.info}
              />
            </View>
          </>
        ) : null}

        {funnel ? <DownloadFunnelCard funnel={funnel} /> : null}

        <DownloadTrendChart data={seriesQuery.data ?? []} locale={locale} />

        {BREAKDOWNS.map((dimension) => (
          <BreakdownSection
            key={dimension}
            dimension={dimension}
            title={breakdownTitle(dimension)}
            description={dimension === 'channel' ? d.channelNote : undefined}
            filter={filter}
            queryKey={key}
          />
        ))}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{d.eventsTitle}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{d.eventsDescription}</Text>

          {events.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>{d.noData}</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={[styles.eventRow, { borderBottomColor: colors.border }]}>
                <View style={styles.eventTop}>
                  <Text style={[styles.eventType, { color: colors.primary }]} numberOfLines={1}>
                    {event.eventType}
                    {event.isBot ? ' (bot)' : ''}
                  </Text>
                  <Text style={[styles.eventDate, { color: colors.textMuted }]}>
                    {new Date(event.occurredAt).toLocaleString(locale)}
                  </Text>
                </View>
                <Text style={[styles.eventMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                  {[event.channel, event.platform, event.countryCode, event.target]
                    .filter(Boolean)
                    .join(' · ') || '-'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SwipeBackEdge>
  );
}

function BreakdownSection({
  dimension,
  title,
  description,
  filter,
  queryKey,
}: {
  dimension: BreakdownDimension;
  title: string;
  description?: string;
  filter: DownloadAnalyticsFilter;
  queryKey: (string | number | boolean | undefined)[];
}) {
  const { data } = useQuery({
    queryKey: ['download-analytics', 'breakdown', dimension, ...queryKey],
    queryFn: () => downloadAnalyticsApi.getBreakdown(dimension, filter),
    placeholderData: (prev) => prev,
  });

  return <BreakdownCard title={title} description={description} rows={data ?? []} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  pageDescription: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  section: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  switchLabel: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  errorText: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  eventRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  eventType: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: FontSize.xs,
  },
  eventMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  empty: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
