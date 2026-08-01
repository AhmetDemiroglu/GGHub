import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const PIECE_COUNT = 40;
const CYCLE_MS = 4200;
/** Sonsuz DEGIL: acik kalan ekran pili yemesin. */
const CYCLES = 3;

/** Marka paleti (primary/accent) artı üç aksan. */
const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#22c55e', '#f43f5e'];

/** Deterministik sozde-rastgele: her parca her acilista ayni yolu izler. */
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface PieceProps {
  seed: {
    left: number;
    width: number;
    height: number;
    phase: number;
    drift: number;
    spin: number;
    color: string;
  };
  progress: SharedValue<number>;
  travel: number;
}

function Piece({ seed, progress, travel }: PieceProps) {
  const style = useAnimatedStyle(() => {
    // Tek paylasik degerden turetiliyor; her parca yalnizca FAZ olarak farkli.
    const p = (progress.value + seed.phase) % 1;

    return {
      transform: [
        { translateY: -40 + p * travel },
        { translateX: Math.sin((p + seed.phase) * Math.PI * 2) * seed.drift },
        { rotate: `${p * seed.spin}deg` },
      ],
      opacity: p < 0.06 ? p / 0.06 : 1,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: seed.left,
          width: seed.width,
          height: seed.height,
          borderRadius: 2,
          backgroundColor: seed.color,
        },
        style,
      ]}
    />
  );
}

/**
 * Tam ekran konfeti. TEK bir paylasik deger 40 parcayi birden surer (40 ayri animasyon
 * DEGIL): tum hareket UI thread'inde, JS koprusunden gecmeden calisir.
 *
 * SVG dugumu degil duz View dikdortgenleri kullaniliyor; Android'de belirgin ucuz ve
 * konfetinin dikdortgenden fazlasina ihtiyaci yok.
 */
export function Confetti({ active = true }: { active?: boolean }) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        left: seeded(i, 1) * width,
        width: 6 + seeded(i, 2) * 6,
        height: 8 + seeded(i, 3) * 10,
        phase: seeded(i, 4),
        drift: (seeded(i, 5) - 0.5) * 90,
        spin: 360 + seeded(i, 6) * 720,
        color: COLORS[i % COLORS.length],
      })),
    [width],
  );

  useEffect(() => {
    if (!active || reducedMotion) return;

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      CYCLES,
      false,
    );

    // Ekran blur olunca / unmount'ta animasyon durmali, arkada calismasin.
    return () => cancelAnimation(progress);
  }, [active, reducedMotion, progress]);

  if (!active || reducedMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((seed, i) => (
        <Piece key={i} seed={seed} progress={progress} travel={height + 80} />
      ))}
    </View>
  );
}
