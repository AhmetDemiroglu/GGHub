import React from 'react';
import { Image } from 'react-native';

/**
 * IGDB marka logosu (mor, seffaf arka plan).
 *
 * DIKKAT: logo ~2.08:1 oraninda YATAY. RAWG/Metacritic/GGHub logolari kare oldugu icin
 * ayni kare kutuya konursa yuksekligi bir kac piksele duser ve okunmaz. Bu yuzden bilesen
 * YUKSEKLIK alir, genisligi orandan hesaplar.
 */
const ASPECT_RATIO = 3840 / 1848;

export function IgdbLogo({ size = 12, opacity = 0.95 }: { size?: number; opacity?: number }) {
  return (
    <Image
      source={require('@/assets/images/igdb_logo.png')}
      style={{ height: size, width: size * ASPECT_RATIO, opacity }}
      resizeMode="contain"
    />
  );
}
