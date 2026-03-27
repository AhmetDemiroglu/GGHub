import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { Badge } from '@/src/components/common/Badge';
import { getListsForUser, getReviewsForUser, getCommentsForUser, getReportsMadeByUser } from '@/src/api/admin';
import { translateReportStatus, getReportStatusVariant } from '@/src/utils/report';
import type { AdminUserListSummary, AdminReviewSummary, AdminCommentSummary, AdminUserReportSummary } from '@/src/models/admin';

interface UserTabsProps {
  userId: number;
}

type TabKey = 'lists' | 'reviews' | 'comments' | 'reports';

const variantToColor: Record<string, { bg: string; text: string }> = {
  info: { bg: '#3b82f620', text: '#3b82f6' },
  success: { bg: '#22c55e20', text: '#22c55e' },
  danger: { bg: '#ef444420', text: '#ef4444' },
};

export function UserTabs({ userId }: UserTabsProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const router = useRouter();
  const m = messages.admin;

  const [activeTab, setActiveTab] = useState<TabKey>('lists');

  const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'lists', label: m.lists, icon: 'list' },
    { key: 'reviews', label: m.reviews, icon: 'chatbox' },
    { key: 'comments', label: m.comments, icon: 'chatbubbles' },
    { key: 'reports', label: m.reportsMade, icon: 'flag' },
  ];

  const listsQuery = useQuery({
    queryKey: ['admin', 'user-lists', userId],
    queryFn: () => getListsForUser(userId).then((res) => res.data),
    enabled: activeTab === 'lists',
  });

  const reviewsQuery = useQuery({
    queryKey: ['admin', 'user-reviews', userId],
    queryFn: () => getReviewsForUser(userId).then((res) => res.data),
    enabled: activeTab === 'reviews',
  });

  const commentsQuery = useQuery({
    queryKey: ['admin', 'user-comments', userId],
    queryFn: () => getCommentsForUser(userId).then((res) => res.data),
    enabled: activeTab === 'comments',
  });

  const reportsQuery = useQuery({
    queryKey: ['admin', 'user-reports', userId],
    queryFn: () => getReportsMadeByUser(userId).then((res) => res.data),
    enabled: activeTab === 'reports',
  });

  const renderListItem = ({ item }: { item: AdminUserListSummary }) => (
    <TouchableOpacity
      style={[styles.listItem, { borderBottomColor: colors.border }]}
      onPress={() => router.push(`/lists/${item.id}` as any)}
    >
      <View style={styles.listItemContent}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
          {item.gameCount} {m.gameCount} | {item.followerCount} {m.followerCount}
        </Text>
      </View>
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={14} color={colors.star} />
        <Text style={[styles.ratingText, { color: colors.text }]}>
          {item.averageRating.toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }: { item: AdminReviewSummary }) => (
    <View style={[styles.listItem, { borderBottomColor: colors.border }]}>
      <View style={styles.listItemContent}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.gameName}</Text>
        <Text style={[styles.itemSubtext, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.content}
        </Text>
      </View>
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={14} color={colors.star} />
        <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating}</Text>
      </View>
    </View>
  );

  const renderCommentItem = ({ item }: { item: AdminCommentSummary }) => (
    <View style={[styles.listItem, { borderBottomColor: colors.border }]}>
      <View style={styles.listItemContent}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{item.listName}</Text>
        <Text style={[styles.itemSubtext, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.fullContent}
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderReportItem = ({ item }: { item: AdminUserReportSummary }) => {
    const variant = getReportStatusVariant(item.status);
    const badgeColor = variantToColor[variant] ?? variantToColor.info;
    return (
      <TouchableOpacity
        style={[styles.listItem, { borderBottomColor: colors.border }]}
        onPress={() => router.push(`/(admin)/reports/${item.reportId}`)}
      >
        <View style={styles.listItemContent}>
          <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
            {item.entityType} #{item.entityId}
          </Text>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
            {item.reason}
          </Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {new Date(item.reportedAt).toLocaleDateString()}
          </Text>
        </View>
        <Badge
          label={translateReportStatus(item.status)}
          color={badgeColor.bg}
          textColor={badgeColor.text}
        />
      </TouchableOpacity>
    );
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'lists': return m.noLists;
      case 'reviews': return m.noReviews;
      case 'comments': return m.noComments;
      case 'reports': return m.noReports;
    }
  };

  const renderContent = () => {
    let data: any[] = [];
    let renderItem: any;
    let isLoading = false;

    switch (activeTab) {
      case 'lists':
        data = listsQuery.data ?? [];
        renderItem = renderListItem;
        isLoading = listsQuery.isLoading;
        break;
      case 'reviews':
        data = reviewsQuery.data ?? [];
        renderItem = renderReviewItem;
        isLoading = reviewsQuery.isLoading;
        break;
      case 'comments':
        data = commentsQuery.data ?? [];
        renderItem = renderCommentItem;
        isLoading = commentsQuery.isLoading;
        break;
      case 'reports':
        data = reportsQuery.data ?? [];
        renderItem = renderReportItem;
        isLoading = reportsQuery.isLoading;
        break;
    }

    if (data.length === 0 && !isLoading) {
      return (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {getEmptyMessage()}
        </Text>
      );
    }

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item: any) => String(item.id ?? item.reportId)}
        scrollEnabled={false}
      />
    );
  };

  return (
    <View>
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabContent}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  listItemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubtext: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  dateText: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingVertical: Spacing.xxl,
  },
});
