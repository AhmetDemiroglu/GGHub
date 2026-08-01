import { useEffect, useState } from 'react';

/**
 * Degeri belirtilen sure boyunca sabit kalana kadar geciktirir.
 *
 * Etiket onerisi icin: her tus vurusunda sunucuya gitmek hem gereksiz istek
 * hem de yaris kosulu (gec donen eski sorgu yeni sonucun ustune yazar) uretir.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
