import React from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/src/components/common/Button';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { deleteMyAccount } from '@/src/api/profile';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface DangerZoneProps {
  onExportData: () => void;
}

export function DangerZone({ onExportData }: DangerZoneProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { logout } = useAuth();
  const dz = messages.profile.dangerZone;

  const deleteMutation = useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      Alert.alert('', dz.deleteSuccess);
      await logout();
    },
    onError: () => {
      Alert.alert('', dz.deleteError);
    },
  });

  const handleDelete = () => {
    Alert.alert(dz.confirmTitle, dz.confirmDescription, [
      { text: dz.cancelButton, style: 'cancel' },
      {
        text: dz.confirmDelete,
        style: 'destructive',
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  return (
    <View style={[styles.container, { borderColor: colors.error }]}>
      <Text style={[styles.title, { color: colors.error }]}>{dz.title}</Text>

      <Text style={[styles.warning, { color: colors.textSecondary }]}>
        {dz.description}
      </Text>

      <View style={styles.buttonRow}>
        <Button
          title={dz.exportButton}
          variant="outline"
          onPress={onExportData}
          icon={<Ionicons name="download-outline" size={18} color={colors.primary} />}
        />
        <Button
          title={dz.deleteButton}
          variant="danger"
          onPress={handleDelete}
          loading={deleteMutation.isPending}
          icon={<Ionicons name="trash-outline" size={18} color="#ffffff" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  warning: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
