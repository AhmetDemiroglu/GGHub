import React, { createContext, useContext, useMemo } from 'react';
import { Gesture, GestureDetector, type GestureType } from 'react-native-gesture-handler';

/**
 * Ana sayfanın tek yatay pan'i (sidebar sürme + sekme değiştirme).
 * Yalnızca TabbedActivityFeed doldurur; diğer ekranlarda null'dır.
 */
const HomePanContext = createContext<GestureType | null>(null);

export const HomePanProvider = HomePanContext.Provider;

interface HorizontalScrollGuardProps {
  children: React.ReactNode;
}

/**
 * Yatay bir listeyi ana sayfanın pan jestinden korur.
 *
 * İlk sekmedeyken sağa çekiş sidebar'ı ekranın her yerinden sürer; bu, yatay
 * karusellerin ÜSTÜNDE de geçerliydi. Niyet eşiği aşılınca pan aktive olup
 * çocuğun native scroll'unu iptal ediyordu: karusel önceki kartlara geri
 * kaydırılamıyor, yerine sidebar açılıyordu (sola çekiş etkilenmiyordu, çünkü
 * o yön zaten bar üstünde jeste takılmıyor).
 *
 * `blocksExternalGesture` ile pan artık bu listenin native scroll'unun
 * başarısız olmasını bekler: dokunuş karuselde başladıysa scroll kazanır,
 * dışarıda başladıysa (sol kenar, boş alan, feed kartları) sidebar eskisi
 * gibi açılır. Karusel dikey çekişte zaten başarısız olur, o yüzden dış
 * listenin dikey scroll'u değişmez.
 *
 * Context yoksa (oturumsuz ana sayfa akışı) ağaç hiç sarılmaz.
 */
export function HorizontalScrollGuard({ children }: HorizontalScrollGuardProps) {
  const homePan = useContext(HomePanContext);
  const nativeGesture = useMemo(
    () => (homePan ? Gesture.Native().blocksExternalGesture(homePan) : null),
    [homePan],
  );

  if (!nativeGesture) return <>{children}</>;

  return <GestureDetector gesture={nativeGesture}>{children}</GestureDetector>;
}
