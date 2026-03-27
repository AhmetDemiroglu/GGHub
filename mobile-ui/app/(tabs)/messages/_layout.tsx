import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';

export default function MessagesLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[username]" />
    </Stack>
  );
}
