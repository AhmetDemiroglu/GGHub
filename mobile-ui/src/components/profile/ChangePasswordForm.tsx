import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { changePassword } from '@/src/api/auth';
import { Spacing, FontSize } from '@/src/constants/theme';

export function ChangePasswordForm() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const cp = messages.profile.changePassword;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      Alert.alert(cp.successTitle, cp.successDescription);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    },
    onError: () => {
      Alert.alert(cp.errorTitle, cp.errorDescription);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = cp.currentPasswordRequired;
    }
    if (newPassword.length < 6) {
      newErrors.newPassword = cp.newPasswordRequired;
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = cp.passwordsMustMatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{cp.title}</Text>

      <Input
        label={cp.currentPasswordLabel}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        error={errors.currentPassword}
      />

      <Input
        label={cp.newPasswordLabel}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        error={errors.newPassword}
      />

      <Input
        label={cp.confirmPasswordLabel}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        error={errors.confirmPassword}
      />

      <Button
        title={cp.submit}
        onPress={handleSubmit}
        loading={mutation.isPending}
        fullWidth
      />
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
});
