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
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { resetPassword, requestPasswordReset } from '@/src/api/auth';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { FontSize, Spacing } from '@/src/constants/theme';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const t = messages.auth;
  const params = useLocalSearchParams<{ email?: string }>();

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [errors, setErrors] = useState<{
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (code.trim().length !== 6) {
      newErrors.code = t.resetPasswordCodeLengthError;
    }

    if (newPassword.length < 6) {
      newErrors.newPassword = t.resetPasswordPasswordLengthError;
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t.resetPasswordPasswordMismatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await resetPassword({
        token: code.trim(),
        newPassword,
      });
      Alert.alert(t.resetPasswordSuccessTitle, t.resetPasswordSuccessDescription, [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const message = axiosError.response?.data?.message || t.resetPasswordErrorDescription;
      Alert.alert(t.resetPasswordErrorTitle, message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!params.email) return;

    setIsSendingCode(true);
    try {
      await requestPasswordReset({ email: params.email });
      Alert.alert(
        t.forgotPasswordSuccessTitle,
        t.forgotPasswordSuccessDescription,
      );
    } catch {
      Alert.alert(t.forgotPasswordErrorTitle, t.forgotPasswordErrorDescription);
    } finally {
      setIsSendingCode(false);
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
            <Text style={[styles.title, { color: colors.text }]}>{t.resetPasswordTitle}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t.resetPasswordDescription}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t.resetPasswordCodeLabel}
              placeholder={t.resetPasswordCodePlaceholder}
              value={code}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(digits);
                if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
              }}
              error={errors.code}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              returnKeyType="next"
            />

            <Input
              label={t.resetPasswordNewPasswordLabel}
              placeholder="********"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword)
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              error={errors.newPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="next"
            />

            <Input
              label={t.resetPasswordConfirmPasswordLabel}
              placeholder="********"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              error={errors.confirmPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />

            <Button
              title={isLoading ? t.resetPasswordPending : t.resetPasswordButton}
              onPress={handleReset}
              loading={isLoading}
              disabled={isLoading}
              style={styles.submitButton}
              size="lg"
            />

            {params.email ? (
              <Button
                title={isSendingCode ? t.forgotPasswordSubmitPending : t.resetPasswordNewCode}
                onPress={handleResendCode}
                loading={isSendingCode}
                disabled={isSendingCode}
                variant="ghost"
                style={styles.resendButton}
              />
            ) : null}
          </View>

          <Button
            title={t.backToLogin}
            onPress={() => router.replace('/(auth)/login')}
            variant="ghost"
          />
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
  resendButton: {
    marginTop: Spacing.sm,
  },
});
