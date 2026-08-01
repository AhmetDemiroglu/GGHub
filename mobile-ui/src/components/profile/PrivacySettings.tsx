import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { ProfileVisibilitySetting, MessagePrivacySetting } from '@/src/models/profile';
import { PostReplyPermissionSetting, PostVisibilitySetting } from '@/src/models/post';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface PrivacySettingsProps {
  profileVisibility: ProfileVisibilitySetting;
  messageSetting: MessagePrivacySetting;
  postVisibility: PostVisibilitySetting;
  postReplyPermission: PostReplyPermissionSetting;
  onVisibilityChange: (value: ProfileVisibilitySetting) => void;
  onMessageSettingChange: (value: MessagePrivacySetting) => void;
  onPostVisibilityChange: (value: PostVisibilitySetting) => void;
  onPostReplyChange: (value: PostReplyPermissionSetting) => void;
}

export function PrivacySettings({
  profileVisibility,
  messageSetting,
  postVisibility,
  postReplyPermission,
  onVisibilityChange,
  onMessageSettingChange,
  onPostVisibilityChange,
  onPostReplyChange,
}: PrivacySettingsProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const p = messages.profile.privacy;

  const visibilityOptions = [
    { value: ProfileVisibilitySetting.Public, label: p.public },
    { value: ProfileVisibilitySetting.Followers, label: p.followersOnly },
    { value: ProfileVisibilitySetting.Private, label: p.private },
  ];

  const messageOptions = [
    { value: MessagePrivacySetting.Everyone, label: p.everyone },
    { value: MessagePrivacySetting.Following, label: p.following },
    { value: MessagePrivacySetting.None, label: p.none },
  ];

  const postVisibilityOptions = [
    { value: PostVisibilitySetting.Everyone, label: p.everyone },
    { value: PostVisibilitySetting.Followers, label: p.followersOnly },
    { value: PostVisibilitySetting.Private, label: p.private },
  ];

  const postReplyOptions = [
    { value: PostReplyPermissionSetting.Everyone, label: p.everyone },
    { value: PostReplyPermissionSetting.Followers, label: p.myFollowers },
    { value: PostReplyPermissionSetting.Following, label: p.following },
    { value: PostReplyPermissionSetting.Nobody, label: p.none },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{p.title}</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>{p.profileVisibilityTitle}</Text>
      <View style={styles.optionsRow}>
        {visibilityOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              {
                backgroundColor:
                  profileVisibility === opt.value ? colors.primary : colors.surfaceHighlight,
                borderColor:
                  profileVisibility === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onVisibilityChange(opt.value)}
          >
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[
                styles.optionText,
                {
                  color: profileVisibility === opt.value ? '#ffffff' : colors.text,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
        {p.messageSettingsTitle}
      </Text>
      <View style={styles.optionsRow}>
        {messageOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              {
                backgroundColor:
                  messageSetting === opt.value ? colors.primary : colors.surfaceHighlight,
                borderColor:
                  messageSetting === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onMessageSettingChange(opt.value)}
          >
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[
                styles.optionText,
                {
                  color: messageSetting === opt.value ? '#ffffff' : colors.text,
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/*
          Gonderi gizliligi. Ayar KULLANICIDA tutuluyor, gonderide degil:
          burada yapilan degisiklik gecmis gonderilere de aninda uygulanir.
          Bu yuzden composer'da ayrica gorunurluk secici YOK.
      */}
      <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
        {p.postVisibilityTitle}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{p.postVisibilityDescription}</Text>
      <View style={styles.optionsRow}>
        {postVisibilityOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              {
                backgroundColor:
                  postVisibility === opt.value ? colors.primary : colors.surfaceHighlight,
                borderColor: postVisibility === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onPostVisibilityChange(opt.value)}
          >
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[
                styles.optionText,
                { color: postVisibility === opt.value ? '#ffffff' : colors.text },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
        {p.postReplyTitle}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{p.postReplyDescription}</Text>
      <View style={styles.optionsRow}>
        {postReplyOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              {
                backgroundColor:
                  postReplyPermission === opt.value ? colors.primary : colors.surfaceHighlight,
                borderColor: postReplyPermission === opt.value ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onPostReplyChange(opt.value)}
          >
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={[
                styles.optionText,
                { color: postReplyPermission === opt.value ? '#ffffff' : colors.text },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.xs,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 58,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
  },
});
