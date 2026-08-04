import React, { useCallback } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AuthRequiredView } from '@/src/components/common/AuthRequiredView';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { ScreenHeader } from '@/src/components/shell';
import { useToast } from '@/src/components/common/Toast';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { getNotificationSettings, updateNotificationSettings } from '@/src/api/notifications';
import {
  NotificationType,
  type NotificationSettings,
  type NotificationSettingsForUpdate,
} from '@/src/models/notification';
import * as haptics from '@/src/utils/haptics';

const SETTINGS_KEY = ['notificationSettings'] as const;

/**
 * Ekrandaki gruplama. Backend TIP BASINA tercih tutuyor; kullanici icin 15 anahtari
 * duz bir liste halinde gostermek okunmaz olurdu, bu yuzden tipler ilgili olduklari
 * yuzeye gore beslenir.
 *
 * Dogum gunu BILEREK yok: sunucu onu yapilandirilabilir tipler arasinda dondurmuyor
 * (bkz. NotificationPreferences.Configurable). Sunucu ileride yeni bir tip donerse
 * ve burada bir gruba yazilmamissa, "diger" grubunda yine de gorunur.
 */
const GROUPS: { titleKey: 'sectionMessages' | 'sectionSocial' | 'sectionPosts' | 'sectionReviews' | 'sectionLists'; types: NotificationType[] }[] = [
  { titleKey: 'sectionMessages', types: [NotificationType.Message] },
  {
    titleKey: 'sectionSocial',
    types: [NotificationType.Follow, NotificationType.ListFollow, NotificationType.Mention],
  },
  {
    titleKey: 'sectionPosts',
    types: [NotificationType.PostLike, NotificationType.PostReply, NotificationType.PostRepost],
  },
  {
    titleKey: 'sectionReviews',
    types: [
      NotificationType.Review,
      NotificationType.ReviewComment,
      NotificationType.ReviewCommentReply,
      NotificationType.ReviewCommentLike,
    ],
  },
  {
    titleKey: 'sectionLists',
    types: [
      NotificationType.ListComment,
      NotificationType.CommentReply,
      NotificationType.CommentLike,
      NotificationType.ListRating,
    ],
  },
];

const TYPE_LABEL_KEYS: Record<number, string> = {
  [NotificationType.Follow]: 'follow',
  [NotificationType.ListFollow]: 'listFollow',
  [NotificationType.Message]: 'message',
  [NotificationType.Review]: 'review',
  [NotificationType.ListComment]: 'listComment',
  [NotificationType.CommentReply]: 'commentReply',
  [NotificationType.CommentLike]: 'commentLike',
  [NotificationType.ListRating]: 'listRating',
  [NotificationType.ReviewComment]: 'reviewComment',
  [NotificationType.ReviewCommentReply]: 'reviewCommentReply',
  [NotificationType.ReviewCommentLike]: 'reviewCommentLike',
  [NotificationType.Mention]: 'mention',
  [NotificationType.PostLike]: 'postLike',
  [NotificationType.PostReply]: 'postReply',
  [NotificationType.PostRepost]: 'postRepost',
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const t = messages.notificationSettings;

  const settingsQuery = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getNotificationSettings,
    enabled: isAuthenticated,
  });

  /**
   * Anahtar IYIMSER cevrilir: dokunma ile gorsel geri bildirim arasinda ag gecikmesi
   * durmasin. Istek patlarsa onbellek istekten ONCEKI duruma geri alinir ve kullaniciya
   * kaydedilemedigi soylenir; sessizce eski degere donen bir anahtar "kaydettim"
   * yanilgisi yaratirdi.
   *
   * Iyimser yazim onMutate ICINDE: boylece geri alma anlik goruntusu dogru anda,
   * yani degisiklik uygulanmadan once alinir.
   */
  const mutation = useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: (update: NotificationSettingsForUpdate) => {
      const previous = queryClient.getQueryData<NotificationSettings>(SETTINGS_KEY);

      queryClient.setQueryData<NotificationSettings>(SETTINGS_KEY, (prev) => {
        if (!prev) return prev;
        const next: NotificationSettings = {
          pushEnabled: update.pushEnabled ?? prev.pushEnabled,
          preferences: prev.preferences,
        };
        if (update.preferences?.length) {
          next.preferences = prev.preferences.map((p) => {
            const incoming = update.preferences!.find((u) => u.type === p.type);
            return incoming ? { ...p, enabled: incoming.enabled } : p;
          });
        }
        return next;
      });

      return { previous };
    },
    // Basarida onbellege DOKUNULMUYOR: iyimser durum zaten sunucuya gonderilenin
    // aynisi, ustune yazmak arka arkaya cevrilen iki anahtardan ilkinin yanitiyla
    // ikincisini geri alirdi.
    onError: (_error, _update, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous);
      showToast('error', t.saveError);
    },
  });

  const settings = settingsQuery.data;

  const setPush = useCallback(
    (value: boolean) => {
      haptics.selection();
      mutation.mutate({ pushEnabled: value });
    },
    [mutation],
  );

  const setType = useCallback(
    (type: NotificationType, value: boolean) => {
      haptics.selection();
      // Yalnizca degisen anahtar gonderilir; uc kismi guncelleme kabul ediyor.
      mutation.mutate({ preferences: [{ type, enabled: value }] });
    },
    [mutation],
  );

  if (!isAuthenticated) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={t.title} onBack={() => router.back()} />
        <AuthRequiredView />
      </ScreenWrapper>
    );
  }

  if (settingsQuery.isLoading) {
    return (
      <ScreenWrapper noPadding safeArea={false}>
        <ScreenHeader title={t.title} onBack={() => router.back()} />
        <LoadingScreen />
      </ScreenWrapper>
    );
  }

  const preferences = settings?.preferences ?? [];
  const grouped = new Set(GROUPS.flatMap((group) => group.types));
  // Sunucu tarafinda yeni bir tip eklenip burada bir gruba yazilmadiysa da gorunsun.
  const ungrouped = preferences.filter((p) => !grouped.has(p.type)).map((p) => p.type);

  const renderRow = (type: NotificationType, isLast: boolean) => {
    // Sunucu bu tipi dondurmediyse (ör. yapilandirilamaz hale getirilmisse) satir cizilmez.
    const preference = preferences.find((p) => p.type === type);
    if (!preference) return null;

    const labelKey = TYPE_LABEL_KEYS[type];
    const label = labelKey ? (t.types as Record<string, string>)[labelKey] : undefined;

    return (
      <View
        key={type}
        style={[
          styles.row,
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label ?? `#${type}`}</Text>
        <Switch
          value={preference.enabled}
          onValueChange={(value) => setType(type, value)}
          trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
        />
      </View>
    );
  };

  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={t.title} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.xxxl }]}
      >
        <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>{t.description}</Text>

        {settingsQuery.isError ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{messages.common.genericError}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.pushTitle}</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t.pushLabel}</Text>
            <Switch
              value={settings?.pushEnabled ?? true}
              onValueChange={setPush}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
            />
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t.pushDescription}</Text>
        </View>

        {GROUPS.map((group) => (
          <View
            key={group.titleKey}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t[group.titleKey]}</Text>
            {group.types.map((type, index) => renderRow(type, index === group.types.length - 1))}
          </View>
        ))}

        {ungrouped.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {ungrouped.map((type, index) => renderRow(type, index === ungrouped.length - 1))}
          </View>
        ) : null}

        <Text style={[styles.footnote, { color: colors.textMuted }]}>{t.birthdayNote}</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  pageDescription: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  hint: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: FontSize.sm,
  },
  footnote: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
});
