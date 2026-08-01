import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { BorderRadius, Spacing } from '@/src/constants/theme';
import { useTheme } from '@/src/hooks/use-theme';
import { getImageUrl } from '@/src/utils/image';
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

  if (images.length === 0) return null;

  const sorted = [...images].sort((a, b) => a.position - b.position).slice(0, 4);
  const cellBg = { backgroundColor: colors.skeleton };

  const cell = (image: PostImage, style: object) => (
    <Image
      key={image.url}
      source={{ uri: getImageUrl(image.url) }}
      style={[style, cellBg]}
      resizeMode="cover"
    />
  );

  if (sorted.length === 1) {
    return (
      <View style={[styles.wrap, { borderColor: colors.border }]}>
        {cell(sorted[0], styles.single)}
      </View>
    );
  }

  if (sorted.length === 2) {
    return (
      <View style={[styles.wrap, styles.row, { borderColor: colors.border }]}>
        {sorted.map((image) => cell(image, styles.half))}
      </View>
    );
  }

  if (sorted.length === 3) {
    return (
      <View style={[styles.wrap, styles.row, { borderColor: colors.border }]}>
        {cell(sorted[0], styles.tallHalf)}
        <View style={styles.column}>
          {cell(sorted[1], styles.quarter)}
          {cell(sorted[2], styles.quarter)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, styles.grid, { borderColor: colors.border }]}>
      {sorted.map((image) => cell(image, styles.quarterGrid))}
    </View>
  );
}

const GAP = 2;

const styles = StyleSheet.create({
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
