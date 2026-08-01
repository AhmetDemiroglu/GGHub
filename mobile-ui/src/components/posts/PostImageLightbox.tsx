import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FontSize, Spacing } from '@/src/constants/theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getImageUrl } from '@/src/utils/image';
import type { PostImage } from '@/src/models/post';

interface PostImageLightboxProps {
  images: PostImage[];
  /** Acik olan gorselin dizini; null ise kapali. */
  index: number | null;
  onClose: () => void;
}

/**
 * Tam ekran gorsel onizleme.
 *
 * BottomSheet DEGIL duz Modal: bu bir sayfa degil, ekrani kaplayan bir katman.
 * Yatay kaydirmali bir galeri yerine ok butonlari kullaniliyor, cunku akistaki
 * yatay jestler zaten sekme degistirme ve geri jestiyle yarisiyor; burada da
 * bir kaydirma katmani eklemek o yarisi buyutur.
 */
export function PostImageLightbox({ images, index, onClose }: PostImageLightboxProps) {
  const { messages } = useLocale();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(index ?? 0);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  if (index === null) return null;

  const image = images[current];
  if (!image) return null;

  const go = (delta: number) => setCurrent((c) => (c + delta + images.length) % images.length);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        {/* Zemine dokununca kapanir; gorselin uzeri kapatmaz. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Image
          source={{ uri: getImageUrl(image.url) }}
          style={{ width: width - Spacing.xxl, height: height * 0.7 }}
          resizeMode="contain"
        />

        <Pressable
          onPress={onClose}
          style={[styles.close, { top: insets.top + Spacing.md }]}
          hitSlop={10}
          accessibilityLabel={messages.common.close}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>

        {images.length > 1 ? (
          <>
            <Pressable onPress={() => go(-1)} style={[styles.nav, styles.navLeft]} hitSlop={10}>
              <Ionicons name="chevron-back" size={26} color="#ffffff" />
            </Pressable>
            <Pressable onPress={() => go(1)} style={[styles.nav, styles.navRight]} hitSlop={10}>
              <Ionicons name="chevron-forward" size={26} color="#ffffff" />
            </Pressable>
            <Text style={[styles.counter, { bottom: insets.bottom + Spacing.xxl }]}>
              {current + 1} / {images.length}
            </Text>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    position: 'absolute',
    right: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    padding: Spacing.sm,
  },
  nav: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    padding: Spacing.sm,
  },
  navLeft: { left: Spacing.sm },
  navRight: { right: Spacing.sm },
  counter: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
  },
});
