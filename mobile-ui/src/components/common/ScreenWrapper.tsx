import React from 'react';
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing } from '@/src/constants/theme';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';

interface ScreenWrapperProps {
  children: React.ReactNode;
  safeArea?: boolean;
  noPadding?: boolean;
  edges?: string[];
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Sol kenardan sağa çekerek geri gitme jesti (iOS + Android). Default açık.
   * Native stack swipe-back'in olduğu nested ekranlarda `false` verilir
   * (çift-geri olmaması için); tab navigator'a kayıtlı düz ekranlarda bu jest devreye girer.
   */
  swipeBackEnabled?: boolean;
}

export function ScreenWrapper({
  children,
  safeArea = true,
  noPadding = false,
  edges,
  style,
  swipeBackEnabled = true,
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
    return (
      <SafeAreaView {...safeAreaProps}>
        <SwipeBackEdge enabled={swipeBackEnabled}>{children}</SwipeBackEdge>
      </SafeAreaView>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <SwipeBackEdge enabled={swipeBackEnabled}>{children}</SwipeBackEdge>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
