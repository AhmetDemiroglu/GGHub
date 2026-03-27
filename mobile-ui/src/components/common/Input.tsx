import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({ label, error, icon, style, ...props }: InputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <View style={icon ? styles.inputRow : undefined}>
        {icon ? (
          <Ionicons
            name={icon as any}
            size={20}
            color={colors.placeholder}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: error ? colors.error : colors.inputBorder,
              color: colors.text,
            },
            icon && { flex: 1, marginBottom: 0 },
            props.multiline && { textAlignVertical: 'top' as const },
            style,
          ]}
          placeholderTextColor={colors.placeholder}
          {...props}
        />
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  error: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  icon: {
    marginRight: Spacing.sm,
  },
});
