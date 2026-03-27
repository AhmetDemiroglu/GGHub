import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Button } from '@/src/components/common/Button';
import { FontSize, Spacing } from '@/src/constants/theme';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const t = messages.notFound;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.code, { color: colors.textMuted }]}>404</Text>
      <Text style={[styles.title, { color: colors.text }]}>{t.title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {t.description}
      </Text>
      <Link href="/(tabs)" asChild>
        <Button title={t.home} variant="primary" onPress={() => {}} style={styles.button} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  code: {
    fontSize: 72,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  button: {
    minWidth: 160,
  },
});
