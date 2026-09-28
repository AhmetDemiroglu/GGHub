import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';

/** Tanitim kartlarindaki botlar; backend AiAgentPersonas kullanici adlariyla ayni. */
export const AI_BOT_USERNAMES = [
  'retro_ai',
  'turbo_ai',
  'liman_ai',
  'golge_ai',
  'kurmay_ai',
  'kalem_ai',
  'nisan_ai',
  'ejder_ai',
  'fener_ai',
  'kombo_ai',
] as const;

export function aiBotAvatarUrl(username: string) {
  return `https://api.dicebear.com/9.x/bottts-neutral/png?seed=${encodeURIComponent(username)}&size=128`;
}

/** Tanitim sohbeti: konusan bot + i18n anahtari (aiPromo.bubbleN). */
export const AI_PROMO_SCRIPT = [
  { speaker: 'retro_ai', key: 'bubble1' },
  { speaker: 'turbo_ai', key: 'bubble2' },
  { speaker: 'liman_ai', key: 'bubble3' },
  { speaker: 'golge_ai', key: 'bubble4' },
  { speaker: 'kurmay_ai', key: 'bubble5' },
  { speaker: 'kalem_ai', key: 'bubble6' },
] as const;

/** Ingilizce arayuzun botlari: backend AiAgentPersonas'in Ingilizce karakterleri (ayni sira, avatar seed'i ayni). */
const AI_BOT_USERNAMES_EN = ['pixel_ai', 'blitz_ai', 'maple_ai', 'hex_ai', 'rook_ai', 'nova_ai'] as const;

/** Canli veri yokken gosterilen botlar, arayuz diline gore (Ingilizce arayuzde Ingilizce botlar). */
export function aiBotUsernames(locale: string): readonly string[] {
  return locale.startsWith('tr') ? AI_BOT_USERNAMES : AI_BOT_USERNAMES_EN;
}

/** Arayuz diline gore tanitim sohbeti (canli veri yokken). Replik metinleri yine i18n aiPromo.bubbleN. */
export function aiPromoScript(locale: string): { speaker: string; key: (typeof AI_PROMO_SCRIPT)[number]['key'] }[] {
  if (locale.startsWith('tr')) return [...AI_PROMO_SCRIPT];
  return AI_PROMO_SCRIPT.map((line, index) => ({ speaker: AI_BOT_USERNAMES_EN[index], key: line.key }));
}

const CONFETTI = [
  { x: 18, y: 14, w: 12, h: 5, r: 25, c: '#facc15' },
  { x: 120, y: 170, w: 10, h: 4, r: -30, c: '#22d3ee' },
  { x: 210, y: 22, w: 8, h: 8, r: 45, c: '#f472b6' },
  { x: 300, y: 180, w: 12, h: 5, r: 15, c: '#a3e635' },
  { x: 250, y: 120, w: 7, h: 7, r: 20, c: '#fb923c' },
  { x: 60, y: 110, w: 9, h: 4, r: -20, c: '#c084fc' },
  { x: 330, y: 60, w: 10, h: 4, r: 60, c: '#fde047' },
];

const STARS = [
  { x: 160, y: 40, s: 7, c: '#fde047' },
  { x: 40, y: 175, s: 6, c: '#67e8f9' },
  { x: 285, y: 95, s: 6, c: '#f9a8d4' },
  { x: 345, y: 150, s: 5, c: '#bef264' },
];

function starPath(x: number, y: number, s: number) {
  const k = s * 0.3;
  return `M${x} ${y - s} L${x + k} ${y - k} L${x + s} ${y} L${x + k} ${y + k} L${x} ${y + s} L${x - k} ${y + k} L${x - s} ${y} L${x - k} ${y - k} Z`;
}

/**
 * AI Kulubu'nun renkli SVG arka plani (dekor). viewBox 360x200, "slice" ile her genislige yayilir.
 * Web'deki AiClubBackground'un mobil karsiligi; blur yerine yari saydam buyuk daireler.
 */
export function AiClubBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgGradient id="aiBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#3b0764" />
            <Stop offset="0.55" stopColor="#1e1033" />
            <Stop offset="1" stopColor="#0c4a6e" />
          </SvgGradient>
        </Defs>
        <Rect width="360" height="200" fill="url(#aiBg)" />
        <Circle cx="0" cy="0" r="110" fill="#d946ef" opacity={0.28} />
        <Circle cx="360" cy="30" r="90" fill="#22d3ee" opacity={0.2} />
        <Circle cx="260" cy="220" r="100" fill="#f59e0b" opacity={0.18} />
        <Circle cx="120" cy="230" r="80" fill="#8b5cf6" opacity={0.3} />

        <G stroke="rgba(167,139,250,0.45)" strokeWidth={1.6} fill="none" strokeLinecap="round">
          <Path d="M0 150 H40 L60 130 H100" />
          <Path d="M360 70 H320 L300 90 H260" />
        </G>
        <Circle cx="100" cy="130" r="3" fill="#a78bfa" />
        <Circle cx="260" cy="90" r="3" fill="#a78bfa" />

        {CONFETTI.map((p, i) => (
          <Rect
            key={i}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            rx={1}
            fill={p.c}
            opacity={0.85}
            transform={`rotate(${p.r} ${p.x + p.w / 2} ${p.y + p.h / 2})`}
          />
        ))}
        {STARS.map((s, i) => (
          <Path key={i} d={starPath(s.x, s.y, s.s)} fill={s.c} />
        ))}

        {/* Piksel kalp */}
        <G fill="#f472b6" opacity={0.9} transform="translate(8 60) scale(2.2)">
          <Rect x="1" y="0" width="2" height="1" />
          <Rect x="4" y="0" width="2" height="1" />
          <Rect x="0" y="1" width="7" height="2" />
          <Rect x="1" y="3" width="5" height="1" />
          <Rect x="2" y="4" width="3" height="1" />
          <Rect x="3" y="5" width="1" height="1" />
        </G>

        {/* Gamepad */}
        <G transform="translate(318 178) rotate(-12)" opacity={0.75}>
          <Rect x="-20" y="-9" width="40" height="18" rx="9" fill="#22d3ee" />
          <Rect x="-13" y="-1.5" width="8" height="3" rx="1" fill="#1e1033" />
          <Rect x="-10.5" y="-4.5" width="3" height="9" rx="1" fill="#1e1033" />
          <Circle cx="8" cy="-2" r="2.2" fill="#1e1033" />
          <Circle cx="13" cy="2.5" r="2.2" fill="#1e1033" />
        </G>
      </Svg>
    </View>
  );
}

/** Yukari asagi suzulen bot avatari (RN Animated, native driver). */
export function FloatingBot({
  username,
  size = 40,
  delay = 0,
  style,
  src,
}: {
  username: string;
  /** Botun gercek avatari (API); yoksa kullanici adindan DiceBear. */
  src?: string | null;
  size?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: -6, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(offset, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [offset, delay]);

  return (
    <Animated.View style={[{ transform: [{ translateY: offset }] }, style]}>
      <View style={[styles.avatarShell, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Image source={{ uri: src || aiBotAvatarUrl(username) }} style={{ width: size, height: size }} />
      </View>
    </Animated.View>
  );
}

/** Akan sohbetin bir satiri: konusan bot, metin, avatar (yoksa kullanici adindan). */
export interface AiTickerLine {
  speaker: string;
  text: string;
  avatar?: string | null;
}

/**
 * Tek satirlik akan bot sohbeti: 3 sn'de bir sonraki replik yumusakca belirir.
 * `lines`: api/ai/club recentLines (gercek son mesajlar) ya da yedek ornek replikler.
 */
export function AiChatTicker({ lines, compact = false }: { lines: AiTickerLine[]; compact?: boolean }) {
  const [step, setStep] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setStep((value) => value + 1);
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [opacity]);

  if (lines.length === 0) return null;
  const line = lines[step % lines.length];

  return (
    <Animated.View style={[styles.bubbleRow, { opacity }]}>
      <Image source={{ uri: line.avatar || aiBotAvatarUrl(line.speaker) }} style={styles.bubbleAvatar} />
      <View style={styles.bubble}>
        <Text style={[styles.bubbleText, compact && { fontSize: 12 }]} numberOfLines={2}>
          <Text style={styles.bubbleHandle}>@{line.speaker} </Text>
          {line.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  avatarShell: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bubbleAvatar: { width: 24, height: 24, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.9)' },
  bubble: {
    flexShrink: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleText: { color: '#18181b', fontSize: 13, lineHeight: 17 },
  bubbleHandle: { color: '#6d28d9', fontWeight: '700', fontSize: 11 },
});
