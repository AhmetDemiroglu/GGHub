import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { BorderRadius, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/hooks/use-theme';
import { getImageUrl } from '@/src/utils/image';
import { PostImageLightbox } from '@/src/components/posts/PostImageLightbox';
import type { PostImage } from '@/src/models/post';

interface PostImageGridProps {
  images: PostImage[];
}

/**
 * 1-4 gorsel icin X benzeri yerlesim. Yukseklikler SABIT (aspectRatio ile):
 * akista gorseller inerken kart ziplamasin. Sunucudan gelen width/height her
 * kayitta dolu olmayabilir, bu yuzden oran gorsel sayisindan turetiliyor.
 */
export function PostImageGrid({ images }: PostImageGridProps) {
  const { colors } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const sorted = [...images].sort((a, b) => a.position - b.position).slice(0, 4);
  const cellBg = { backgroundColor: colors.skeleton };

  // Her hucre dokunulabilir: gorsele dokunmak tam ekran onizleme acar, karti
  // detaya goturmez. PostCard'daki icerik dokunusu bu Pressable'in ustunde
  // durdugu icin ic dokunus once yakalanir.
  const cell = (image: PostImage, position: number, style: object) => (
    <Pressable
      key={image.url}
      onPress={() => setOpenIndex(position)}
      style={[style, cellBg]}
      accessibilityRole="imagebutton"
    >
      <Image source={{ uri: getImageUrl(image.url) }} style={styles.fill} resizeMode="cover" />
    </Pressable>
  );

  const grid = (() => {
    if (sorted.length === 1) {
      return (
        <View style={[styles.wrap, { borderColor: colors.border }]}>
          {cell(sorted[0], 0, styles.single)}
        </View>
      );
    }

    if (sorted.length === 2) {
      return (
        <View style={[styles.wrap, styles.row, { borderColor: colors.border }]}>
          {sorted.map((image, i) => cell(image, i, styles.half))}
        </View>
      );
    }

    if (sorted.length === 3) {
      return (
        <View style={[styles.wrap, styles.row, { borderColor: colors.border }]}>
          {cell(sorted[0], 0, styles.tallHalf)}
          <View style={styles.column}>
            {cell(sorted[1], 1, styles.quarter)}
            {cell(sorted[2], 2, styles.quarter)}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.wrap, styles.grid, { borderColor: colors.border }]}>
        {sorted.map((image, i) => cell(image, i, styles.quarterGrid))}
      </View>
    );
  })();

  return (
    <>
      {grid}
      <PostImageLightbox images={sorted} index={openIndex} onClose={() => setOpenIndex(null)} />
    </>
  );
}

const GAP = 2;

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  wrap: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  column: {
    flex: 1,
    gap: GAP,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  single: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  half: {
    flex: 1,
    aspectRatio: 1,
  },
  tallHalf: {
    flex: 1,
    aspectRatio: 1 / 2,
  },
  quarter: {
    flex: 1,
    aspectRatio: 1,
  },
  quarterGrid: {
    width: `${50}%`,
    aspectRatio: 1,
  },
});
