import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '@/src/hooks/use-theme';
import { Springs } from '@/src/constants/theme';

/** Web'deki birthday-cake.tsx ile AYNI viewBox ve AYNI koordinatlar. */
const VIEW = 200;
const SIZE = 220;
/** Kullanici birimi -> ekran pikseli. */
const U = SIZE / VIEW;

const CANDLES = [
  { x: 76, phase: 0 },
  { x: 100, phase: 0.33 },
  { x: 124, phase: 0.66 },
];

const TOP_DRIPS = [67, 76.5, 86, 95.5, 105, 114.5, 124, 133.5];
const BOTTOM_DRIPS = [45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155];

const SPRINKLES = [
  { x: 72, y: 112, r: -25, c: '#facc15' },
  { x: 92, y: 118, r: 15, c: '#f43f5e' },
  { x: 112, y: 110, r: 40, c: '#22c55e' },
  { x: 128, y: 119, r: -10, c: '#38bdf8' },
  { x: 52, y: 150, r: 20, c: '#f43f5e' },
  { x: 70, y: 159, r: -30, c: '#facc15' },
  { x: 90, y: 149, r: 45, c: '#38bdf8' },
  { x: 110, y: 160, r: 10, c: '#22c55e' },
  { x: 130, y: 150, r: -20, c: '#facc15' },
  { x: 148, y: 158, r: 35, c: '#f43f5e' },
];

const SPARKLES = [
  { x: 30, y: 62, s: 1.3, phase: 0 },
  { x: 170, y: 68, s: 1.05, phase: 0.25 },
  { x: 160, y: 104, s: 1.2, phase: 0.5 },
  { x: 22, y: 144, s: 1, phase: 0.62 },
  { x: 178, y: 148, s: 0.85, phase: 0.37 },
  { x: 100, y: 14, s: 1.15, phase: 0.75 },
];

const STAR_PATH = 'M0,-9 Q1.5,-1.5 9,0 Q1.5,1.5 0,9 Q-1.5,1.5 -9,0 Q-1.5,-1.5 0,-9 Z';

/**
 * Alev + hale. SVG dugumunu degil, onu SARAN Animated.View'i olceklendiriyoruz:
 * Reanimated 4 ile SVG primitiflerini dogrudan animasyonlamak platformlar arasi
 * tutarsiz. Alev yine gercek bir damla sekli, cunku mini bir Svg icinde ciziliyor.
 */
function Flame({
  x,
  phase,
  driver,
  frozen,
}: {
  x: number;
  phase: number;
  driver: SharedValue<number>;
  frozen: boolean;
}) {
  const boxLeft = (x - 14) * U;
  const boxTop = 34 * U;
  const boxSize = 28 * U;

  const style = useAnimatedStyle(() => {
    if (frozen) return { opacity: 1 };

    // Tek paylasik degerden sinus dalgasi; her mum farkli fazda titrer.
    const w = Math.sin(((driver.value + phase) % 1) * Math.PI * 2);

    return {
      opacity: 0.94 + 0.06 * ((w + 1) / 2),
      transform: [
        // Olcek merkezini kutunun ALTINA tasi: alev tabanindan buyusun.
        { translateY: boxSize / 2 },
        { scaleY: 1 + 0.11 * w },
        { scaleX: 1 - 0.05 * w },
        { translateY: -boxSize / 2 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: boxLeft, top: boxTop, width: boxSize, height: boxSize }, style]}
    >
      <Svg width="100%" height="100%" viewBox={`${x - 14} 34 28 28`}>
        <Defs>
          <LinearGradient id={`flame-${x}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#fff3b0" />
            <Stop offset="55%" stopColor="#fbbf24" />
            <Stop offset="100%" stopColor="#f97316" />
          </LinearGradient>
          <RadialGradient id={`glow-${x}`}>
            <Stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={x} cy={48} r={14} fill={`url(#glow-${x})`} />
        <Path
          d={`M ${x} 38 C ${x + 4.8} 45 ${x + 4.8} 52 ${x} 56 C ${x - 4.8} 52 ${x - 4.8} 45 ${x} 38 Z`}
          fill={`url(#flame-${x})`}
        />
        <Ellipse cx={x} cy={51} rx={1.8} ry={2.9} fill="#fff9db" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

/** Parildayan dort kollu yildiz. Flame ile ayni sarmalayici desen. */
function Sparkle({
  x,
  y,
  s,
  phase,
  driver,
  frozen,
}: {
  x: number;
  y: number;
  s: number;
  phase: number;
  driver: SharedValue<number>;
  frozen: boolean;
}) {
  const half = 11 * s;
  const style = useAnimatedStyle(() => {
    if (frozen) return { opacity: 0.9, transform: [{ scale: 1 }] };

    const p = (driver.value + phase) % 1;
    const opacity = p < 0.35 ? p / 0.35 : p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35);

    return {
      opacity,
      transform: [{ scale: 0.4 + p * 0.95 }, { rotate: `${p * 90}deg` }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: (x - half) * U,
          top: (y - half) * U,
          width: half * 2 * U,
          height: half * 2 * U,
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}>
        <Path d={STAR_PATH} fill="#fbbf24" opacity={0.85} transform={`scale(${s})`} />
        <Circle cx={0} cy={0} r={2.2 * s} fill="#fffbeb" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Animasyonlu dogum gunu pastasi. Web'deki SVG ile ayni tasarim: iki kat, sarkan
 * krema, serpme sekerler, uc yanan mum ve cevrede parildayan yildizlar.
 * prefers-reduced-motion (sistem "hareketi azalt" ayari) altinda hareket durur,
 * pasta tam olarak gorunmeye devam eder.
 */
export function BirthdayCake() {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();

  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  const flameDriver = useSharedValue(0);
  const sparkleDriver = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      entrance.value = 1;
      return;
    }

    entrance.value = withSpring(1, Springs.bouncy);
    flameDriver.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.linear }), -1, false);
    sparkleDriver.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);

    return () => {
      cancelAnimation(flameDriver);
      cancelAnimation(sparkleDriver);
    };
  }, [reducedMotion, entrance, flameDriver, sparkleDriver]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ scale: 0.9 + entrance.value * 0.1 }, { translateY: (1 - entrance.value) * 20 }],
  }));

  const plateColor = isDark ? '#ffffff' : '#0f172a';

  return (
    <Animated.View style={[{ width: SIZE, height: SIZE }, entranceStyle]}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
          <Defs>
            <LinearGradient id="cake-frosting" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#7C4DFF" />
              <Stop offset="100%" stopColor={colors.primaryLight} />
            </LinearGradient>
            <LinearGradient id="cake-drip" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.72" />
            </LinearGradient>
          </Defs>

          {/* Mum govdeleri ve fitiller (alevler ustteki katmanda) */}
          {CANDLES.map((candle) => (
            <G key={candle.x}>
              <Line
                x1={candle.x}
                y1={57}
                x2={candle.x}
                y2={62}
                stroke="#57534e"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              <Rect x={candle.x - 3.5} y={62} width={7} height={30} rx={3} fill="#fdf4ff" />
              <Rect x={candle.x - 3.5} y={68} width={7} height={3.5} fill="#7C4DFF" opacity={0.55} />
              <Rect x={candle.x - 3.5} y={76} width={7} height={3.5} fill="#f43f5e" opacity={0.5} />
              <Rect x={candle.x - 3.5} y={84} width={7} height={3.5} fill="#7C4DFF" opacity={0.55} />
            </G>
          ))}

          {/* Ust kat */}
          <Rect x={62} y={92} width={76} height={36} rx={8} fill="url(#cake-frosting)" />
          <Rect x={62} y={92} width={76} height={9} rx={4.5} fill="url(#cake-drip)" />
          {TOP_DRIPS.map((x) => (
            <Circle key={`top-${x}`} cx={x} cy={101} r={4.5} fill="url(#cake-drip)" />
          ))}

          {/* Alt kat */}
          <Rect x={40} y={128} width={120} height={42} rx={10} fill="url(#cake-frosting)" />
          <Rect x={40} y={128} width={120} height={10} rx={5} fill="url(#cake-drip)" />
          {BOTTOM_DRIPS.map((x) => (
            <Circle key={`bottom-${x}`} cx={x} cy={138} r={5} fill="url(#cake-drip)" />
          ))}

          {/* Serpme sekerler */}
          {SPRINKLES.map((sprinkle) => (
            <Rect
              key={`${sprinkle.x}-${sprinkle.y}`}
              x={-1.2}
              y={-3.5}
              width={2.4}
              height={7}
              rx={1.2}
              fill={sprinkle.c}
              transform={`translate(${sprinkle.x} ${sprinkle.y}) rotate(${sprinkle.r})`}
            />
          ))}

          {/* Tabak */}
          <Ellipse cx={100} cy={174} rx={78} ry={9} fill={plateColor} opacity={0.14} />
          <Ellipse cx={100} cy={172} rx={62} ry={5} fill={plateColor} opacity={0.08} />
        </Svg>

        {SPARKLES.map((sparkle) => (
          <Sparkle
            key={`${sparkle.x}-${sparkle.y}`}
            {...sparkle}
            driver={sparkleDriver}
            frozen={reducedMotion}
          />
        ))}

        {CANDLES.map((candle) => (
          <Flame key={candle.x} {...candle} driver={flameDriver} frozen={reducedMotion} />
        ))}
      </View>
    </Animated.View>
  );
}
