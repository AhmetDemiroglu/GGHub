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
      style={[styles.spacer, style]}
      accessibilityLabel={messages.ai.badgeHint}
      accessibilityRole="text"
    >
      <View style={styles.badge}>
        <Text style={styles.text}>{messages.ai.badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Isimle rozet arasi bosluk. marginLeft DEGIL: <Text> icine gomulu View'da iOS dis marjini yok sayiyor
  // ve rozet isme yapisiyordu; ic dolgu kutunun olcusune dahil oldugu icin her yerde calisir.
  spacer: {
    paddingLeft: 6,
    alignSelf: 'center',
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.45)',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  text: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});
