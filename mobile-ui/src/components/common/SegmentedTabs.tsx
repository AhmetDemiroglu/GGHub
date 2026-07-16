import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { BorderRadius, FontSize, Spacing, Springs, Shadows } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

interface SegmentedTab<T extends string> {
  key: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  /**
   * Opsiyonel sürekli indeks (0..count-1). Verilirse indicator bu değeri
   * birebir izler; yatay swipe sırasında pill parmakla birlikte kayar
   * (X hissi). Verilmezse activeKey değişiminde spring ile atlar.
   */
  progress?: SharedValue<number>;
}

/**
 * iOS UISegmentedControl / Material pill tabs hissi veren animasyonlu sekme.
 * Aktif sekme arkasında sliding pill indicator (Reanimated spring).
 * Press'te haptics.selection.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  activeKey,
  onChange,
  progress,
}: SegmentedTabsProps<T>) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = React.useState(0);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeKey),
  );

  const indicatorLeft = useSharedValue(activeIndex);
  const count = tabs.length;
  const innerPadding = 4;
  const indicatorWidth = containerWidth > 0
    ? Math.max((containerWidth - innerPadding * 2) / count, 0)
    : 0;

  React.useEffect(() => {
    indicatorLeft.value = withSpring(activeIndex, Springs.smooth);
  }, [activeIndex, indicatorLeft]);

  const indicatorStyle = useAnimatedStyle(() => {
    const index = progress ? progress.value : indicatorLeft.value;
    const clamped = Math.min(Math.max(index, 0), count - 1);
    return {
      left: innerPadding + clamped * indicatorWidth,
      width: indicatorWidth,
    };
  });

  const handlePress = (tab: SegmentedTab<T>) => {
    if (tab.key !== activeKey) {
      haptics.selection();
      onChange(tab.key);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfaceHighlight }]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {/* Sliding indicator */}
      {containerWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.background },
            Shadows.sm,
            indicatorStyle,
          ]}
          pointerEvents="none"
        />
      ) : null}
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: active ? colors.primary : colors.textSecondary,
                  fontWeight: active ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: BorderRadius.md,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: FontSize.sm,
  },
});
