import React from 'react';
import { View, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing } from '@/src/constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  safeArea?: boolean;
  noPadding?: boolean;
  edges?: string[];
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenWrapper({
  children,
  safeArea = true,
  noPadding = false,
  edges,
  scrollEnabled = true,
  style,
}: ScreenWrapperProps) {
  const { colors } = useTheme();

  const containerStyle: ViewStyle[] = [
    styles.container,
    { backgroundColor: colors.background },
    !noPadding && { paddingHorizontal: Spacing.md },
  ].filter(Boolean) as ViewStyle[];

  if (safeArea) {
    const safeAreaProps: any = {
      style: [containerStyle, style],
    };
    if (edges) {
      safeAreaProps.edges = edges;
    }
    return <SafeAreaView {...safeAreaProps}>{children}</SafeAreaView>;
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
