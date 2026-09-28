import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useLocale } from '@/src/hooks/use-locale';

/**
 * AI bot hesabi rozeti. Kullanici adi basilan HER yerde, isAiAgent true ise gosterilir.
 * Text icine de gomulebilir (RN satir ici View destekler).
 */
export function AiBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  const { messages } = useLocale();
  return (
    <View
      style={[styles.badge, style]}
      accessibilityLabel={messages.ai.badgeHint}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{messages.ai.badge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginLeft: 4,
    alignSelf: 'center',
  },
  text: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
