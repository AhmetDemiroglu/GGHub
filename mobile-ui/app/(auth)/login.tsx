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
import { useAuth } from '@/src/hooks/use-auth';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { login as loginApi } from '@/src/api/auth';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { FontSize, Spacing } from '@/src/constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const t = messages.auth;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t.loginErrorTitle, t.validation.emailOrUsernameRequired);
      return;
    }
    if (!password.trim()) {
      Alert.alert(t.loginErrorTitle, t.validation.passwordRequired);
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginApi({ email: email.trim(), password });
      await login(response.data);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || t.loginDefaultError;
      Alert.alert(t.loginErrorTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

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
            <Text style={[styles.title, { color: colors.text }]}>{t.loginTitle}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t.loginEmailLabel}
              placeholder={t.loginEmailPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
            />

            <Input
              label={t.passwordLabel}
              placeholder="********"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Text style={StyleSheet.flatten([styles.forgotPassword, { color: colors.primary }])}>
                {t.forgotPassword}
              </Text>
            </Link>

            <Button
              title={isLoading ? t.loginPending : t.loginTitle}
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t.noAccount}{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Text style={StyleSheet.flatten([styles.footerLink, { color: colors.primary }])}>
                {t.createAccount}
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
  forgotPassword: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.sm,
  },
  loginButton: {
    marginTop: Spacing.sm,
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
});
