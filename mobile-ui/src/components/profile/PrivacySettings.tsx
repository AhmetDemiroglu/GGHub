import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { ProfileVisibilitySetting, MessagePrivacySetting } from '@/src/models/profile';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface PrivacySettingsProps {
  profileVisibility: ProfileVisibilitySetting;
  messageSetting: MessagePrivacySetting;
  onVisibilityChange: (value: ProfileVisibilitySetting) => void;
  onMessageSettingChange: (value: MessagePrivacySetting) => void;
}

export function PrivacySettings({
  profileVisibility,
  messageSetting,
  onVisibilityChange,
  onMessageSettingChange,
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
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
