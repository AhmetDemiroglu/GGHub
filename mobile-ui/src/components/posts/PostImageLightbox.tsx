import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

/** Bu mesafeyi gecen dikey surukleme birakilinca kapatir. */
const DISMISS_DISTANCE = 110;
/** Mesafe yetmese bile bu hizin ustunde firlatma kapatir. */
const DISMISS_VELOCITY = 0.75;
/** Parmak bu kadar az oynadiysa surukleme degil DOKUNUS sayilir.
 *  Dar tutulursa ozensiz dokunuslar (parmak 10px kayar) hicbir sey yapmaz. */
const TAP_SLOP = 14;

/**
 * Tam ekran gorsel onizleme.
 *
 * BottomSheet DEGIL duz Modal: bu bir sayfa degil, ekrani kaplayan bir katman.
 *
 * TUM ekran tek bir PanResponder'a bagli. Eskiden kapatma isi ust uste binmis
 * uc ayri Pressable'a dagilmisti (zemin + gorsel + X) ve ILK DOKUNUS BOSA
 * GIDIYORDU: lightbox'i acan dokunusun ardindan akistaki ScrollView/Pressable
 * hala RN'in genel "responder"i oluyor, modal icindeki ilk dokunus onu
 * sonlandirmakla harcaniyor, ancak ikinci dokunus onPress'e ulasiyordu.
 * Tek bir kok responder bu pazarligi ilk dokunusta bitiriyor.
 *
 * Ayni responder dikey surukleme ile kapatmayi da veriyor: gorsel parmagi
 * takip eder, zemin saydamlasir, esigi gecince firlatilip kapanir.
 *
 * Surukleme RNGH/Reanimated DEGIL PanResponder + RN Animated (native driver)
 * ile: Modal icinde Reanimated jest kombinasyonu iOS'ta native crash veriyordu
 * (bkz. BottomSheet.tsx'teki ayni not).
 */
export function PostImageLightbox({ images, index, onClose }: PostImageLightboxProps) {
  const { messages } = useLocale();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(index ?? 0);

  const translateY = useRef(new Animated.Value(0)).current;
  // Kapanis animasyonu suresince onClose'un iki kez cagrilmasini engeller.
  const closing = useRef(false);

  useEffect(() => {
    if (index !== null) {
      setCurrent(index);
      closing.current = false;
      translateY.setValue(0);
    }
  }, [index, translateY]);

  const finishClose = useMemo(
    () => (direction: number) => {
      if (closing.current) return;
      closing.current = true;
      Animated.timing(translateY, {
        toValue: direction * height,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => onClose());
    },
    [height, onClose, translateY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Kok seviyesinde BUBBLE (capture degil): X ve ok butonlari daha derinde
        // oldugu icin kendi dokunuslarini once kaparlar, geri kalan her yer
        // buraya duser.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        // Altimizda kaydirilabilir bir sey yok; jesti kimseye birakma.
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          if (closing.current) return;
          translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (closing.current) return;

          const movedFar = Math.abs(gesture.dy) > DISMISS_DISTANCE;
          const flung = Math.abs(gesture.vy) > DISMISS_VELOCITY && Math.abs(gesture.dy) > 20;
          if (movedFar || flung) {
            finishClose(gesture.dy >= 0 ? 1 : -1);
            return;
          }

          // Parmak neredeyse hic oynamadiysa bu bir dokunus: X'teki gibi kapat.
          if (Math.hypot(gesture.dx, gesture.dy) < TAP_SLOP) {
            onClose();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            friction: 9,
            tension: 80,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          if (closing.current) return;
          Animated.spring(translateY, {
            toValue: 0,
            friction: 9,
            tension: 80,
            useNativeDriver: true,
          }).start();
        },
      }),
    [finishClose, onClose, translateY],
  );

  if (index === null) return null;

  const image = images[current];
  if (!image) return null;

  const go = (delta: number) => setCurrent((c) => (c + delta + images.length) % images.length);

  // Suruklendikce zemin saydamlasir ve gorsel hafifce kuculur: parmagin
  // altindaki sey gercekten "cikiyor" gibi hissettirir.
  const dismissRange = height * 0.45;
  // Ucdaki +-height noktalari finishClose'un firlattigi yer: orada zemin TAM
  // seffaf olsun ki Modal kaldirilirken goze carpan bir sicrama kalmasin.
  const backdropOpacity = translateY.interpolate({
    inputRange: [-height, -dismissRange, 0, dismissRange, height],
    outputRange: [0, 0.15, 1, 0.15, 0],
    extrapolate: 'clamp',
  });
  const scale = translateY.interpolate({
    inputRange: [-dismissRange, 0, dismissRange],
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/*
        Modal AYRI bir native pencerede acilir; uygulamanin kokundeki
        GestureHandlerRootView bu pencereyi KAPSAMAZ. Kapsamayinca RNGH'nin
        dokunus dagitimi ile RN'in kendi responder sistemi arasinda kalan ilk
        dokunus dusuyor. RNGH'nin kendi dokumantasyonunun Modal icin istedigi
        sey de tam olarak bu sarmalayici.
        Dikkat: burada Reanimated JEST'i kullanilmiyor; yalnizca kok view.
        (Reanimated Gesture + Modal ikilisi iOS'ta crash veriyordu, bkz.
        BottomSheet.tsx.)
      */}
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.root} {...panResponder.panHandlers}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
          />

          <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
            <Image
              source={{ uri: getImageUrl(image.url) }}
              style={{ width: width - Spacing.xxl, height: height * 0.7 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Butonlar kok responder'in USTUNDE: daha derin olduklari icin kendi
              dokunuslarini once kapiyorlar, surukleme onlarin uzerinde baslamaz. */}
          <Animated.View style={[styles.chrome, { opacity: backdropOpacity }]} pointerEvents="box-none">
            <Pressable
              onPress={onClose}
              style={[styles.close, { top: insets.top + Spacing.md }]}
              hitSlop={12}
              accessibilityLabel={messages.common.close}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </Pressable>

            {images.length > 1 ? (
              <>
                <Pressable onPress={() => go(-1)} style={[styles.nav, styles.navLeft]} hitSlop={12}>
                  <Ionicons name="chevron-back" size={26} color="#ffffff" />
                </Pressable>
                <Pressable onPress={() => go(1)} style={[styles.nav, styles.navRight]} hitSlop={12}>
                  <Ionicons name="chevron-forward" size={26} color="#ffffff" />
                </Pressable>
                <Text style={[styles.counter, { bottom: insets.bottom + Spacing.xxl }]}>
                  {current + 1} / {images.length}
                </Text>
              </>
            ) : null}
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
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
