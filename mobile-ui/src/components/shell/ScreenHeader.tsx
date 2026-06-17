import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize } from '@/src/constants/theme';

const HEADER_CONTENT_HEIGHT = 44;

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  rightExtra?: React.ReactNode;
  hideBack?: boolean;
}

export function ScreenHeader({ title, onBack, rightExtra, hideBack = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: colors.background,
          borderBottomColor: colors.tabBarBorder,
        },
      ]}
    >
      <View style={[styles.inner, { height: HEADER_CONTENT_HEIGHT }]}>
        <View style={styles.sideSlot}>
          {!hideBack ? (
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.center} pointerEvents="none">
          {title ? (
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          ) : null}
        </View>

        <View style={styles.sideSlot}>
          {rightExtra ? <View style={styles.rightInner}>{rightExtra}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {},
    }),
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  sideSlot: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
