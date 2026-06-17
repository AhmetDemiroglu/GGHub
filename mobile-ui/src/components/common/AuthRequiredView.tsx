import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize } from '@/src/constants/theme';

// Full-page guest block (mobile equivalent of the web's UnauthorizedAccess).
export function AuthRequiredView({ message }: { message?: string }) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const ap = messages.authPrompt;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceHighlight }]}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{ap.title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message || ap.message}</Text>
        <Button title={ap.signIn} onPress={() => router.push('/(auth)/login')} size="lg" style={styles.btn} />
        <Button title={ap.signUp} onPress={() => router.push('/(auth)/register')} variant="outline" size="lg" style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center' },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  btn: { width: '100%', maxWidth: 320 },
});
