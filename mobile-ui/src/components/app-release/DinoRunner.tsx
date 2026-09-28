import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import * as haptics from '@/src/utils/haptics';

/**
 * Chrome'un cevrimdisi T-Rex oyununun mobil, tek dokunuslu hali. Bakim ve zorunlu guncelleme
 * ekraninda kullaniciyi oyalar. Fizik ve carpisma UI thread'de (useFrameCallback), React yalniza
 * skor ve oyun sonu icin uyarilir; JS thread'i mesgulken bile oyun akici kalir.
 *
 * RN Modal ICINDE kullanma (iOS Fabric + Reanimated crash'i, bkz. ConfirmDialog notu).
 */

const HEIGHT = 200;
const GROUND = 28; // alt cizginin yuksekligi
const DINO_X = 24;
const DINO_W = 34;
const DINO_H = 36;
const CACTUS_W = 18;
const GRAVITY = 2200;
const JUMP_VELOCITY = 620;
const START_SPEED = 260;
const MAX_SPEED = 520;

// Piksel dino (12 sutun x 12 satir). "#" dolu hucre.
const DINO_PIXELS = [
  '.......####.',
  '......######',
  '......##.###',
  '......######',
  '......####..',
  '......###...',
  '#....######.',
  '#...#####...',
  '##.#######..',
  '.#########..',
  '..#######...',
  '...##..##...',
];

const CACTUS_PIXELS = [
  '..##..',
  '..##..',
  '#.##.#',
  '#.##.#',
  '#.##.#',
  '######',
  '..##..',
  '..##..',
  '..##..',
  '..##..',
];

function PixelSprite({ rows, cell, color }: { rows: string[]; cell: number; color: string }) {
  const w = rows[0].length * cell;
  const h = rows.length * cell;
  return (
    <Svg width={w} height={h}>
      {rows.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '#' ? <Rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={color} /> : null,
        ),
      )}
    </Svg>
  );
}

interface DinoRunnerProps {
  onGameOver?: (score: number) => void;
}

/** Dis kapsayici (BlockedScreen) bos alana dokunusu da oyuna iletsin diye. */
export interface DinoRunnerHandle {
  tap: () => void;
}

export const DinoRunner = forwardRef<DinoRunnerHandle, DinoRunnerProps>(function DinoRunner({ onGameOver }, ref) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.appRelease.game;

  const [width, setWidth] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'over'>('idle');

  const areaWidth = useSharedValue(0);
  const running = useSharedValue(0);
  const dinoY = useSharedValue(0);
  const velocity = useSharedValue(0);
  const speed = useSharedValue(START_SPEED);
  const distance = useSharedValue(0);
  const lastScore = useSharedValue(0);
  const cactus1X = useSharedValue(9999);
  const cactus1H = useSharedValue(1);
  const cactus2X = useSharedValue(9999);
  const cactus2H = useSharedValue(1);
  const cloudX = useSharedValue(9999);

  const finish = useCallback(
    (finalScore: number) => {
      haptics.error();
      setPhase('over');
      setBest((b) => Math.max(b, finalScore));
      onGameOver?.(finalScore);
    },
    [onGameOver],
  );

  const reset = useCallback(
    (w: number) => {
      dinoY.value = 0;
      velocity.value = 0;
      speed.value = START_SPEED;
      distance.value = 0;
      lastScore.value = 0;
      cactus1X.value = w + 120;
      cactus1H.value = 0.8 + Math.random() * 0.5;
      cactus2X.value = w + 120 + 260 + Math.random() * 200;
      cactus2H.value = 0.8 + Math.random() * 0.5;
      cloudX.value = w * 0.6;
    },
    [dinoY, velocity, speed, distance, lastScore, cactus1X, cactus1H, cactus2X, cactus2H, cloudX],
  );

  // Sabit referans: useFrameCallback her yeni callback'te yeniden kayit yapar, skor guncellemesi
  // basina kayit/kayit silme olmasin.
  const tick = useCallback((frame: { timeSincePreviousFrame: number | null }) => {
    'worklet';
    if (!running.value) return;
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const w = areaWidth.value;

    // Dino fizigi
    if (dinoY.value > 0 || velocity.value > 0) {
      velocity.value -= GRAVITY * dt;
      dinoY.value = Math.max(0, dinoY.value + velocity.value * dt);
      if (dinoY.value === 0) velocity.value = 0;
    }

    // Hiz ve skor
    speed.value = Math.min(MAX_SPEED, speed.value + 6 * dt);
    distance.value += speed.value * dt;
    const s = Math.floor(distance.value / 12);
    if (s !== lastScore.value) {
      lastScore.value = s;
      runOnJS(setScore)(s);
    }

    // Engeller: ekrandan cikan, digerinin onune rastgele araligla yeniden dogar.
    cactus1X.value -= speed.value * dt;
    cactus2X.value -= speed.value * dt;
    const gap = () => 240 + Math.random() * 220;
    if (cactus1X.value < -CACTUS_W) {
      cactus1X.value = Math.max(w, cactus2X.value + gap());
      cactus1H.value = 0.8 + Math.random() * 0.5;
    }
    if (cactus2X.value < -CACTUS_W) {
      cactus2X.value = Math.max(w, cactus1X.value + gap());
      cactus2H.value = 0.8 + Math.random() * 0.5;
    }
    cloudX.value -= speed.value * 0.18 * dt;
    if (cloudX.value < -70) cloudX.value = w + 30;

    // Carpisma (kutular biraz daraltilmis: adil hissettirsin)
    const dinoLeft = DINO_X + 6;
    const dinoRight = DINO_X + DINO_W - 6;
    const hit = (x: number, hScale: number) => {
      const top = CACTUS_PIXELS.length * 3 * hScale;
      return x < dinoRight && x + CACTUS_W > dinoLeft && dinoY.value < top - 6;
    };
    if (hit(cactus1X.value, cactus1H.value) || hit(cactus2X.value, cactus2H.value)) {
      running.value = 0;
      runOnJS(finish)(s);
    }
  }, [running, areaWidth, dinoY, velocity, speed, distance, lastScore, cactus1X, cactus1H, cactus2X, cactus2H, cloudX, finish]);

  useFrameCallback(tick);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    areaWidth.value = w;
    if (!running.value) reset(w);
  };

  // Ekrandan ayrilirken dongu dursun.
  useEffect(() => () => { running.value = 0; }, [running]);

  const onTap = () => {
    if (phase !== 'running') {
      reset(areaWidth.value);
      running.value = 1;
      setScore(0);
      setPhase('running');
      haptics.impactLight();
      return;
    }
    if (dinoY.value === 0) {
      velocity.value = JUMP_VELOCITY;
      haptics.selection();
    }
  };

  useImperativeHandle(ref, () => ({ tap: onTap }));

  const dinoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -dinoY.value }] }));
  const cactus1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cactus1X.value }, { scaleY: cactus1H.value }],
  }));
  const cactus2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cactus2X.value }, { scaleY: cactus2H.value }],
  }));
  const cloudStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cloudX.value }] }));

  const spriteColor = colors.text;
  const cactusColor = colors.success;

  return (
    <Pressable onPress={onTap} onLayout={onLayout} style={[styles.area, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: colors.textSecondary }]}>{m.best} {String(best).padStart(5, '0')}</Text>
        <Text style={[styles.score, { color: colors.text }]}>{String(score).padStart(5, '0')}</Text>
      </View>

      {width > 0 ? (
        <>
          <Animated.View style={[styles.cloud, { backgroundColor: colors.surfaceHighlight }, cloudStyle]} />
          <Animated.View style={[styles.dino, dinoStyle]}>
            <PixelSprite rows={DINO_PIXELS} cell={3} color={spriteColor} />
          </Animated.View>
          <Animated.View style={[styles.cactus, cactus1Style]}>
            <PixelSprite rows={CACTUS_PIXELS} cell={3} color={cactusColor} />
          </Animated.View>
          <Animated.View style={[styles.cactus, cactus2Style]}>
            <PixelSprite rows={CACTUS_PIXELS} cell={3} color={cactusColor} />
          </Animated.View>
        </>
      ) : null}

      <View style={[styles.ground, { backgroundColor: colors.border }]} />

      {phase !== 'running' ? (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={[styles.overlayTitle, { color: colors.text }]}>{phase === 'over' ? m.gameOver : m.title}</Text>
          <Text style={[styles.overlayHint, { color: colors.textSecondary }]}>{phase === 'over' ? m.tapToRestart : m.tapToStart}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  area: {
    height: HEIGHT,
    width: '100%',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  scoreRow: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  score: {
    fontSize: FontSize.sm,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: 1,
  },
  cloud: {
    position: 'absolute',
    top: 34,
    left: 0,
    width: 56,
    height: 14,
    borderRadius: 7,
    opacity: 0.8,
  },
  dino: {
    position: 'absolute',
    left: DINO_X,
    bottom: GROUND,
    width: DINO_W,
    height: DINO_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cactus: {
    position: 'absolute',
    left: 0,
    bottom: GROUND,
    // scaleY alt kenardan buyusun diye transform merkezi tabana cekildi.
    transformOrigin: 'bottom',
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: GROUND - 2,
    height: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: GROUND,
  },
  overlayTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 1,
  },
  overlayHint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
});
