import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { requestPasswordReset } from '@/src/api/auth';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { FontSize, Spacing } from '@/src/constants/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const t = messages.auth;

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t.forgotPasswordErrorTitle, t.forgotPasswordEmailRequired);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t.forgotPasswordErrorTitle, t.forgotPasswordEmailInvalid);
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset({ email: email.trim() });
      setSent(true);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || t.forgotPasswordErrorDescription;
      Alert.alert(t.forgotPasswordErrorTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <Text style={[styles.successTitle, { color: colors.success }]}>
            {t.forgotPasswordSuccessTitle}
          </Text>
          <Text style={[styles.successDescription, { color: colors.textSecondary }]}>
            {t.forgotPasswordSuccessDescription}
          </Text>
          <Button
            title={t.resetPasswordTitle}
            onPress={() =>
              router.push({
                pathname: '/(auth)/reset-password',
                params: { email: email.trim() },
              })
            }
            variant="primary"
            size="lg"
            style={styles.actionButton}
          />
          <Link href="/(auth)/login" asChild>
            <Text style={[styles.backLink, { color: colors.primary }]}>{t.backToLogin}</Text>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t.forgotPasswordTitle}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t.forgotPasswordCardDescription}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t.forgotPasswordEmailLabel}
              placeholder={t.forgotPasswordEmailPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Button
              title={isLoading ? t.forgotPasswordSubmitPending : t.forgotPasswordSubmit}
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              size="lg"
            />
          </View>

          <Link href="/(auth)/login" asChild>
            <Text style={[styles.backLink, { color: colors.primary }]}>{t.backToLogin}</Text>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing.xxl,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  backLink: {
    fontSize: FontSize.md,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successDescription: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  actionButton: {
    minWidth: 200,
  },
});
