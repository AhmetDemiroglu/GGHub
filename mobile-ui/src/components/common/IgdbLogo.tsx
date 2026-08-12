import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';

/**
 * IGDB rozet simgesi. Diger kaynaklar (RAWG, Metacritic, GGHub) PNG asset kullaniyor;
 * IGDB icin elimizde PNG olmadigindan SVG olarak cizildi (web'deki igdb-logo ile ayni sekil).
 * Gercek marka logosu eklenirse assets/images/igdb_logo.png konup ScorePill'de Image'a donulebilir.
 */
export function IgdbLogo({ size = 12, opacity = 0.95 }: { size?: number; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Rect width={24} height={24} rx={6} fill="#2c3b8f" />
      <Rect x={3.5} y={6} width={3} height={12} rx={1.5} fill="#ffffff" />
      <Path
        d="M10 6.5h5.2c3.3 0 5.6 2.2 5.6 5.5s-2.3 5.5-5.6 5.5H10V6.5zm3.2 2.8v5.4h1.8c1.6 0 2.6-1 2.6-2.7s-1-2.7-2.6-2.7h-1.8z"
        fill="#ffffff"
      />
    </Svg>
  );
}
