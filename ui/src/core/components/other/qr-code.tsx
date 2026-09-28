import { useMemo, type ReactNode } from 'react'
import { encodeQr, qrShapes, QR_EYE } from '@/core/lib/qr-code'

interface QrCodeProps {
  value: string
  /** Ekran okuyucu etiketi. */
  label: string
  /**
   * Ortaya yerleşecek logo, 24x24 viewBox içinde çizilmiş SVG içeriği (path, g ...).
   * Verilirse ortadaki modüller boşaltılır, logo beyaz bir karonun üstüne oturur.
   */
  logo?: ReactNode
  /** Noktaların ve göz çerçevelerinin rengi. KOYU olmalı, açık zemin üstünde okunur. */
  darkColor?: string
  /** Göz içindeki karenin rengi (marka vurgusu). Bu da koyu tonda seçilmeli. */
  eyeColor?: string
  className?: string
}

/**
 * Noktalı, yuvarlak köşe gözlü, isteğe bağlı logolu QR kod.
 *
 * Okunabilirlik kuralları (değiştirmeden önce oku):
 *  - Zemin HER ZAMAN beyaz, modüller koyu. Koyu temada da ters çevrilmez: ters QR'ı bazı
 *    kamera uygulamaları okumuyor. Renkler temadan değil prop'tan gelir, çünkü tema
 *    değişkenleri koyu modda açık tona dönüyor ve kod okunmaz hale geliyor.
 *  - En az Q düzeyi ve en az sürüm 6. Q, logonun kapattığı alanı rahatça telafi eder;
 *    sürüm 6'da ortada hizalama deseni YOK, logo hiçbir işlev desenini örtmüyor.
 *  - Logo alanı 9x9 modül (kodun ~%5'i). Büyütmeden önce çözücüyle yeniden sına.
 */
export const QrCode = ({
  value,
  label,
  logo,
  darkColor = '#0f172a',
  eyeColor = darkColor,
  className,
}: QrCodeProps) => {
  const hasLogo = Boolean(logo)
  const shapes = useMemo(
    () => qrShapes(encodeQr(value, { ecl: 'Q', minVersion: 6 }), { logoModules: hasLogo ? 9 : 0 }),
    [value, hasLogo]
  )

  return (
    <svg viewBox={shapes.viewBox} role="img" aria-label={label} className={className} shapeRendering="geometricPrecision">
      <rect x={shapes.origin} y={shapes.origin} width={shapes.extent} height={shapes.extent} fill="#ffffff" />
      <path d={shapes.dotsPath} fill={darkColor} />

      {shapes.eyes.map((eye) => (
        <g key={`${eye.x}-${eye.y}`}>
          <rect
            x={eye.x + 0.5}
            y={eye.y + 0.5}
            width={6}
            height={6}
            rx={QR_EYE.outerRadius}
            fill="none"
            stroke={darkColor}
            strokeWidth={1}
          />
          <rect x={eye.x + 2} y={eye.y + 2} width={3} height={3} rx={QR_EYE.innerRadius} fill={eyeColor} />
        </g>
      ))}

      {logo && shapes.logo ? (
        <>
          <rect x={shapes.logo.x} y={shapes.logo.y} width={shapes.logo.size} height={shapes.logo.size} rx={2.2} fill="#ffffff" />
          <svg
            x={shapes.logo.x + 1.6}
            y={shapes.logo.y + 1.6}
            width={shapes.logo.size - 3.2}
            height={shapes.logo.size - 3.2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {logo}
          </svg>
        </>
      ) : null}
    </svg>
  )
}
