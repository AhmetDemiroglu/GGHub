import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
/**
 * Parmak bu kadar az oynadiysa surukleme degil DOKUNUS sayilir.
 * Dar tutulursa ozensiz dokunuslar (parmak 10px kayar) hicbir sey yapmaz.
 */
const TAP_SLOP = 14;
const ENTER_MS = 140;
const EXIT_MS = 140;
const FLING_MS = 180;

/**
 * Tam ekran gorsel onizleme.
 *
 * BottomSheet DEGIL duz Modal: bu bir sayfa degil, ekrani kaplayan bir katman.
 *
 * ---------------------------------------------------------------------------
 * ANIMASYON DEGERLERI HER ACILISTA **RENDER SIRASINDA** SIFIRLANIR.
 *
 * Bunun sebebi cok somut bir hata: translateY/enter degerleri useRef'te
 * yasiyor ve bilesen (index null iken null donse de) MOUNT KALIYOR. Suruklerek
 * kapatinca translateY +-height'ta kaliyordu. Bir sonraki acilista Modal ILK
 * KAREDE gorsel ekran disinda, zemin opakligi 0 olarak monte oluyordu:
 *
 *   - kullanici "dokundum ama acilmadi" goruyordu (aslinda ACIKTI, gorunmezdi),
 *   - ekrani kaplayan gorunmez katman sonraki dokunuslari yutuyordu,
 *   - akisi kaydirmaya calisinca bu katmanin PanResponder'i jesti aliyor,
 *     gorsel ekranin disindan iceri girip cikiyordu: "kaydirirken acik olmayan
 *     gorselin kapandigini goruyorsun".
 *
 * Sifirlamayi useEffect'e birakmak yetmiyor: effect ilk karenin ARDINDAN
 * calisir, yani bozuk kare zaten cizilmis olur. Bu yuzden React'in "render
 * sirasinda state duzeltme" deseni kullaniliyor.
 * ---------------------------------------------------------------------------
 *
 * animationType="none": acilis/kapanis fade'i BIZDE. Modal'in kendi asenkron
 * sunum animasyonu kendi animasyonumuzla ust uste binince kapanistan sonra
 * birkac dokunus daha yutuluyordu.
 *
 * Tum ekran tek bir PanResponder'a bagli; ust uste binmis Pressable'lar yerine
 * tek responder oldugu icin ilk dokunus pazarliga harcanmiyor. Ayni responder
 * dikey surukleme ile kapatmayi da veriyor.
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

  /** Surukleme ofseti. */
  const translateY = useRef(new Animated.Value(0)).current;
  /** Acilis/kapanis: 0 = yok, 1 = tam gorunur. */
  const enter = useRef(new Animated.Value(0)).current;
  /** Kapanis animasyonu suresince yeni jest kabul edilmez, onClose bir kez calisir. */
  const closing = useRef(false);
  const prevIndex = useRef<number | null>(null);

  // ---- Render sirasinda senkron sifirlama (yukaridaki nota bak) ----
  if (index !== prevIndex.current) {
    const opening = prevIndex.current === null && index !== null;
    prevIndex.current = index;
    if (opening) {
      translateY.setValue(0);
      enter.setValue(0);
      closing.current = false;
    }
    if (index !== null) setCurrent(index);
  }

  // Acilista zemin ve gorsel yumusak girer.
  useEffect(() => {
    if (index === null) return;
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [index, enter]);

  // Emniyet kemeri: kapali duruma dusen HER senaryoda degerler temiz kalsin ki
  // bir sonraki acilis asla gorunmez bir katman uretmesin.
  useEffect(() => {
    if (index !== null) return;
    translateY.setValue(0);
    enter.setValue(0);
    closing.current = false;
  }, [index, enter, translateY]);

  /** direction verilirse gorsel o yone firlatilir, verilmezse yerinde solar. */
  const close = useCallback(
    (direction?: 1 | -1) => {
      if (closing.current) return;
      closing.current = true;

      const anim = direction
        ? Animated.timing(translateY, {
            toValue: direction * height,
            duration: FLING_MS,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          })
        : Animated.timing(enter, {
            toValue: 0,
            duration: EXIT_MS,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          });

      anim.start(() => onClose());
    },
    [enter, height, onClose, translateY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Kok seviyesinde BUBBLE (capture degil): X ve ok butonlari daha derinde
        // oldugu icin kendi dokunuslarini once kaparlar, geri kalan her yer
        // buraya duser. Kapanirken hicbir jest kabul edilmez.
        onStartShouldSetPanResponder: () => !closing.current,
        onMoveShouldSetPanResponder: (_, gesture) => !closing.current && Math.abs(gesture.dy) > 4,
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
            close(gesture.dy >= 0 ? 1 : -1);
            return;
          }

          // Parmak neredeyse hic oynamadiysa bu bir dokunus: X'teki gibi kapat.
          if (Math.hypot(gesture.dx, gesture.dy) < TAP_SLOP) {
            close();
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
    [close, translateY],
  );

  // Suruklendikce zemin saydamlasir ve gorsel hafifce kuculur: parmagin
  // altindaki sey gercekten "cikiyor" gibi hissettirir.
  const { backdropOpacity, scale } = useMemo(() => {
    const dismissRange = height * 0.45;
    // Ucdaki +-height noktalari close(direction)'in firlattigi yer: orada zemin
    // TAM seffaf olsun ki Modal kaldirilirken goze carpan sicrama kalmasin.
    const dragFade = translateY.interpolate({
      inputRange: [-height, -dismissRange, 0, dismissRange, height],
      outputRange: [0, 0.15, 1, 0.15, 0],
      extrapolate: 'clamp',
    });
    return {
      backdropOpacity: Animated.multiply(enter, dragFade),
      scale: translateY.interpolate({
        inputRange: [-dismissRange, 0, dismissRange],
        outputRange: [0.82, 1, 0.82],
        extrapolate: 'clamp',
      }),
    };
  }, [enter, height, translateY]);

  if (index === null) return null;

  const image = images[current];
  if (!image) return null;

  const go = (delta: number) => setCurrent((c) => (c + delta + images.length) % images.length);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => close()}
      statusBarTranslucent
    >
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
      <GestureHandlerRootView style={styles.fill}>
        <View style={styles.root} {...panResponder.panHandlers}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
          />

          <Animated.View style={{ opacity: enter, transform: [{ translateY }, { scale }] }}>
            <Image
              source={{ uri: getImageUrl(image.url) }}
              style={{ width: width - Spacing.xxl, height: height * 0.7 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Butonlar kok responder'in USTUNDE: daha derin olduklari icin kendi
              dokunuslarini once kapiyorlar, surukleme onlarin uzerinde baslamaz. */}
          <Animated.View
            style={[styles.chrome, { opacity: backdropOpacity }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => close()}
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
  // DUZ flex:1, ortalama YOK. Sarmalayiciya root'u (alignItems:'center')
  // verince ic View capraz eksende icerigine gore daraliyor, absoluteFill zemin
  // de o dar kutuyu kapliyordu: ekranin iki yaninda gorsel genisligi kadar
  // (Spacing.xxl / 2) aydinlik serit kaliyordu.
  fill: {
    flex: 1,
  },
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
