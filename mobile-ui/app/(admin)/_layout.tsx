import React from 'react';
import { Stack } from 'expo-router';
import { AuthGuard } from '@/src/components/common/AuthGuard';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';

export default function AdminLayout() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.admin;

  return (
    <AuthGuard requiredRole="Admin">
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="dashboard" options={{ title: m.dashboard }} />
        <Stack.Screen name="users/index" options={{ title: m.users }} />
        <Stack.Screen name="users/[id]" options={{ title: m.userDetail }} />
        <Stack.Screen name="reports/index" options={{ title: m.reports }} />
        <Stack.Screen name="reports/[id]" options={{ title: m.reportDetailTitle }} />
      </Stack>
    </AuthGuard>
  );
}
