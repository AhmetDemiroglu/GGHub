"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/core/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

/**
 * Next image optimizer'ın kabul ettiği genişlikler (`imageSizes` varsayılanı).
 * Başka bir değer istenirse optimizer 400 döner, o yüzden en yakın üsttekine yuvarlıyoruz.
 */
const ALLOWED_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384] as const

const snapWidth = (width: number) =>
  ALLOWED_WIDTHS.find((allowed) => allowed >= width) ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1]

/**
 * Avatarı Next image optimizer üzerinden geçirir.
 *
 * Radix `AvatarImage` ham bir `<img>` basıyor: R2'deki profil fotoğrafı ne boyuttaysa o
 * boyutta iniyordu. Lighthouse'ta ana sayfada 28-48 px'lik dairelere basılan avatarlar
 * toplam ~1.7 MB tutuyordu (tek dosya 632 KB). Optimizer AVIF/WebP'e çevirip istenen
 * genişlikte servis ediyor, aynı avatar birkaç KB'a düşüyor.
 *
 * Yalnızca mutlak http(s) URL'ler yönlendirilir; data:/blob:/göreli yollar aynen geçer.
 * Kaynak host'un `next.config.ts > images.remotePatterns` içinde olması gerekir.
 */
const buildOptimizedSrc = (src: string, width: number) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`

const isOptimizable = (src: unknown): src is string =>
  typeof src === "string" && (src.startsWith("https://") || src.startsWith("http://"))

function AvatarImage({
  className,
  src,
  size = 64,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image> & { size?: number }) {
  // srcSet bilerek KULLANILMIYOR. Radix yükleme durumunu `new window.Image()` ile `src`
  // üzerinden yokluyor; srcSet verildiğinde tarayıcı ayrıca 2x girdiyi çekiyor ve her avatar
  // iki kez iniyordu (ölçüldü: 10 avatar -> 20 istek). Bunun yerine tek seferde retina
  // genişliği servis ediliyor; WebP'te 96 px bir avatar birkaç KB.
  const optimizedSrc = React.useMemo(
    () => (isOptimizable(src) ? buildOptimizedSrc(src, snapWidth(size * 2)) : src),
    [src, size]
  )

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      src={optimizedSrc}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
