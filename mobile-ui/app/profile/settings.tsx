import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { Card } from '@/src/components/common/Card';
import { PrivacySettings } from '@/src/components/profile/PrivacySettings';
import { ChangePasswordForm } from '@/src/components/profile/ChangePasswordForm';
import { DangerZone } from '@/src/components/profile/DangerZone';
import { BlockedUsersDialog } from '@/src/components/profile/BlockedUsersDialog';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { getMyProfile, updateProfileVisibility, updateMessageSetting } from '@/src/api/profile';
import {
  ProfileVisibilitySetting,
  MessagePrivacySetting,
} from '@/src/models/profile';
import type { AppLocale } from '@/src/i18n';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages, locale, switchLocale } = useLocale();
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const h = messages.profile.header;
  const dz = messages.profile.dangerZone;

  const [blockedUsersVisible, setBlockedUsersVisible] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  const visibilityMutation = useMutation({
    mutationFn: (newVisibility: ProfileVisibilitySetting) =>
      updateProfileVisibility({ newVisibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
  });

  const messageSettingMutation = useMutation({
    mutationFn: (newSetting: MessagePrivacySetting) =>
      updateMessageSetting({ newSetting }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
  });

  const handleLogout = () => {
    Alert.alert(messages.nav.logout, messages.nav.logout + '?', [
      { text: messages.common.cancel, style: 'cancel' },
      {
        text: messages.nav.logout,
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  const handleExportData = () => {
    Alert.alert('', dz.exportTitle);
  };

  const toggleLocale = () => {
    const next: AppLocale = locale === 'tr' ? 'en-US' : 'tr';
    switchLocale(next);
  };

  const profile = profileQuery.data;

  if (profileQuery.isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{h.settings}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/profile/edit')}
        >
          <Ionicons name="person-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>{h.editProfile}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => setBlockedUsersVisible(true)}
        >
          <Ionicons name="ban-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>{messages.profile.blockedUsersDialog.title}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={toggleLocale}
        >
          <Ionicons name="language-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>{messages.nav.language}</Text>
          <Text style={[styles.menuValue, { color: colors.textSecondary }]}>
            {locale === 'tr' ? 'TR' : 'EN'}
          </Text>
        </TouchableOpacity>

        {user?.role === 'Admin' ? (
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/(admin)/dashboard')}
          >
            <Ionicons name="shield-outline" size={22} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primary }]}>
              {messages.admin.adminPanel}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/my-reports')}
        >
          <Ionicons name="flag-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            {messages.report.myReports}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/about')}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>{messages.footer.about}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/terms')}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            {messages.footer.terms}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/privacy')}
        >
          <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text }]}>
            {messages.footer.privacy}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.section}>
          {profile ? (
            <PrivacySettings
              profileVisibility={profile.profileVisibility as ProfileVisibilitySetting}
              messageSetting={profile.messageSetting as MessagePrivacySetting}
              onVisibilityChange={(v) => visibilityMutation.mutate(v)}
              onMessageSettingChange={(v) => messageSettingMutation.mutate(v)}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <ChangePasswordForm />
        </View>

        <View style={styles.section}>
          <DangerZone onExportData={handleExportData} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>{messages.nav.logout}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <BlockedUsersDialog
        visible={blockedUsersVisible}
        onClose={() => setBlockedUsersVisible(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: FontSize.sm,
  },
  section: {
    marginTop: Spacing.xxl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
});
