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
import { register as registerApi } from '@/src/api/auth';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { FontSize, Spacing } from '@/src/constants/theme';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const t = messages.auth;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string }>(
    {},
  );

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (username.trim().length < 3) {
      newErrors.username = t.registerUsernameMin;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = t.registerEmailRequired;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = t.registerEmailInvalid;
    }

    if (password.length < 6) {
      newErrors.password = t.registerPasswordMin;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await registerApi({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || t.registerErrorDescription;
      Alert.alert(t.registerErrorTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <Text style={[styles.successTitle, { color: colors.success }]}>
            {t.registrationSuccessTitle}
          </Text>
          <Text style={[styles.successDescription, { color: colors.textSecondary }]}>
            {t.registrationSuccessDescription}
          </Text>
          <Button
            title={t.backToLogin}
            onPress={() => router.replace('/(auth)/login')}
            variant="primary"
            size="lg"
            style={styles.backButton}
          />
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
            <Text style={[styles.appName, { color: colors.primary }]}>GGHub</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t.registerCreateTitle}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t.registerUsernameLabel}
              placeholder={t.registerUsernamePlaceholder}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
              }}
              error={errors.username}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="next"
            />

            <Input
              label={t.registerEmailLabel}
              placeholder={t.registerEmailPlaceholder}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />

            <Input
              label={t.registerPasswordLabel}
              placeholder={t.registerPasswordPlaceholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <Button
              title={isLoading ? t.registerSubmitPending : t.registerTitle}
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              style={styles.registerButton}
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t.registerHaveAccount}{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {t.loginTitle}
              </Text>
            </Link>
          </View>
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
  appName: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '600',
  },
  form: {
    marginBottom: Spacing.xxl,
  },
  registerButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSize.md,
  },
  footerLink: {
    fontSize: FontSize.md,
    fontWeight: '600',
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
  backButton: {
    minWidth: 200,
  },
});
