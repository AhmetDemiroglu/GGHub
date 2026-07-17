import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';
// RN'in KeyboardAvoidingView'i DEGIL. RN'inki Android'de Modal ICINDE calisamaz:
// Android'de klavye event'ini yalnizca ReactRootView uretir, Modal'in kokü ise
// DialogRootViewGroup (bir ReactViewGroup) oldugu icin Dialog penceresi
// keyboardDidShow/Hide HIC yaymaz. Ustelik behavior={undefined} veriliyordu ve
// RN o durumda duz bir <View> render edip tamamen no-op oluyordu: sheet klavyenin
// altinda kaliyor, yazi alani ve Gonder butonu gorunmuyordu.
// kc Dialog penceresini ModalAttachedWatcher ile ayrica dinler.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize, BorderRadius, Shadows } from '@/src/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;

// Swipe-to-close esikleri
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.5;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Alt sayfa: RN Modal + PanResponder + RN Animated (native driver).
 * Tutamaktan asagi surukleyince esige gore kapanir ya da geri snap eder.
 *
 * SURUKLEME hala RNGH/Reanimated KULLANMAZ: bu kombinasyon iOS'ta kanitlanmis
 * ve crash'siz; Reanimated Gesture tabanli sheet iOS+Fabric'te native crash
 * veriyordu. translateY/overlayOpacity bu yuzden RN Animated'te kalmali.
 *
 * Tek istisna klavye kacinmasi: keyboard-controller'in KeyboardAvoidingView'i
 * iceride Reanimated kullanir ama JEST kullanmaz (yalnizca useAnimatedStyle ile
 * paddingBottom surer), yani yukaridaki crash desenine girmez. Android'de
 * Modal icinde calisan tek secenek de odur (bkz. import notu).
 */
export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Modal yalnizca acma akisinda mount edilir, kapanis animasyonu bitince unmount.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: CLOSE_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: CLOSE_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, overlayOpacity, translateY]);

  // Handle alaninda calisan PanResponder. Asagi surukleyince sheet kayar;
  // birakildiginda esige gore kapanir ya da geri yukari snap eder.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
            const fade = Math.max(0.2, 1 - gesture.dy / (SCREEN_HEIGHT * 0.5));
            overlayOpacity.setValue(fade);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldClose =
            gesture.dy > CLOSE_DISTANCE || gesture.vy > CLOSE_VELOCITY;
          if (shouldClose) {
            onClose();
          } else {
            Animated.parallel([
              Animated.spring(translateY, {
                toValue: 0,
                friction: 9,
                tension: 80,
                useNativeDriver: true,
              }),
              Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 160,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 9,
            tension: 80,
            useNativeDriver: true,
          }).start();
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateY, overlayOpacity, onClose],
  );

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: overlayOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <KeyboardAvoidingView
          // Iki platformda da 'padding'. kc'nin hesabi iOS'ta RN'inkiyle
          // OZDES (ikisi de frame.y + frame.height - keyboardY), yalnizca
          // deger JS thread yerine UI thread'de akar.
          behavior="padding"
          // Negatif offset: sheet klavyenin birkaç px arkasına insin ki klavyenin
          // yuvarlak üst köşelerinde karartı (overlay) yerine sheet yüzeyi görünsün.
          keyboardVerticalOffset={Platform.OS === 'ios' ? -24 : 0}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, transform: [{ translateY }] },
              Shadows.xl,
            ]}
          >
            {/* Tutamak - drag burada baslar */}
            <View style={styles.handleArea} {...panResponder.panHandlers}>
              <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
              {title ? (
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              ) : null}
            </View>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.sm,
    maxHeight: '80%',
  },
  handleArea: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
});
