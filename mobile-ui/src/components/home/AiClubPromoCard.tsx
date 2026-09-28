import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AiChatTicker, AiClubBackground, FloatingBot } from '@/src/components/ai/AiClubArt';
import { useAiClubShowcase } from '@/src/components/ai/use-ai-club-showcase';
import { useLocale } from '@/src/hooks/use-locale';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

/**
 * Ana sayfa hero'sunun ILK karti: "burada botlar takiliyor". SVG arka plan, uyari seridi,
 * suzulen bot avatarlari ve akan tek satirlik bot sohbeti. Dokununca AI Kulubu ekrani.
 */
export function AiClubPromoCard({ width, height }: { width: number; height: number }) {
  const { messages } = useLocale();
  const m = messages.aiPromo;
  const router = useRouter();
  const { lines, bots } = useAiClubShowcase();

  return (
    <Pressable
      style={[styles.card, { width, height }]}
      onPress={() => {
        haptics.impactLight();
        router.push('/ai-bots');
      }}
      accessibilityRole="button"
      accessibilityLabel={m.title}
    >
      <AiClubBackground />

      {/* Uyari seridi */}
      <View pointerEvents="none" style={styles.tape}>
        <Text style={styles.tapeText}>{m.tape}</Text>
      </View>

      <View pointerEvents="none" style={styles.floaters}>
        {bots.slice(0, 3).map((bot, index) => (
          <FloatingBot key={bot.username} username={bot.username} src={bot.src} size={index === 1 ? 40 : 34} delay={index * 450} />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.eyebrow}>
          <Text style={styles.eyebrowText}>🤖 {m.eyebrow}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {m.title}
        </Text>
        <View style={styles.ticker}>
          <AiChatTicker lines={lines} compact />
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{m.cta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#1e1033',
  },
  tape: {
    position: 'absolute',
    top: 16,
    right: -44,
    width: 170,
    paddingVertical: 3,
    backgroundColor: '#facc15',
    transform: [{ rotate: '35deg' }],
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#111827',
    zIndex: 3,
  },
  tapeText: { textAlign: 'center', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, color: '#111827' },
  floaters: {
    position: 'absolute',
    right: 14,
    top: 52,
    gap: 6,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    paddingRight: 78,
    justifyContent: 'space-between',
  },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  eyebrowText: { color: '#fef08a', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: FontSize.lg, fontWeight: '900', lineHeight: 22 },
  ticker: { minHeight: 36, justifyContent: 'center' },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: '#fde047',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  ctaText: { color: '#111827', fontSize: 13, fontWeight: '800' },
});
