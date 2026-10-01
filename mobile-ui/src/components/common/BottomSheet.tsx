import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  Keyboard,
  ScrollView,
  FlatList,
  type FlatListProps,
  type ScrollViewProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type GestureResponderEvent,
  type PanResponderGestureState,
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
import { useLocale } from '@/src/hooks/use-locale';
import { Spacing, FontSize, BorderRadius, Shadows } from '@/src/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OPEN_DURATION = 280;

/** Surukleme bu kadar dikey hareketten sonra baslar (kucuk titremeler dokunus sayilir). */
const DRAG_SLOP = 6;
/** Yuksekligin bu orani asagi cekilip birakilirsa kapanir. */
const CLOSE_RATIO = 0.3;
/** Bu hizdan (pt/ms) hizli asagi savurma, mesafeye bakmadan kapatir. */
const CLOSE_VELOCITY = 0.6;
/** Yukari cekince en fazla bu kadar esner (X'teki gibi lastik direnci). */
const RUBBER_LIMIT = 36;

/**
 * Dokunusun basladigi kaydirma alaninin durumu:
 * null = kaydirma alani disinda, 'locked' = surukleme yasak (tarih carki gibi),
 * nesne = o listenin anlik kaydirma konumu.
 */
type TouchOrigin = null | 'locked' | { offset: number };

interface SheetScrollContextValue {
  setTouchOrigin: (origin: TouchOrigin) => void;
}

const SheetScrollContext = createContext<SheetScrollContextValue | null>(null);

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Alt sayfa (X davranisi): pencerenin HER YERINDEN asagi cekilebilir; yarim
 * cekip birakinca esnek sekilde geri oturur, yeterince cekince ya da hizla
 * savurunca parmagin hiziyla kapanir. Yukari cekince hafifce esner.
 *
 * Eskiden yalnizca ust kenardaki ince tutamak surukleniyordu: govdeye ya da
 * listeye dokunup cekmek hicbir sey yapmiyordu. Uzun listeli pencereler ekranin
 * neredeyse tamamini kapladigi icin disari dokunacak yer de kalmiyordu.
 *
 * Kaydirilabilir icerik BottomSheetFlatList / BottomSheetScrollView ile cizilir:
 * liste en ustteyken asagi cekmek pencereyi tasir, asagidayken once liste
 * yukari kayar. Duz ScrollView/FlatList kullanilirsa pencere listenin konumunu
 * bilemez ve kaydirmayi yutabilir.
 *
 * SURUKLEME RNGH/Reanimated KULLANMAZ: PanResponder + RN Animated iOS'ta
 * kanitlanmis ve crash'siz; Reanimated Gesture tabanli sheet iOS+Fabric'te
 * native crash veriyordu. Tek istisna klavye kacinmasi: keyboard-controller'in
 * KeyboardAvoidingView'i iceride Reanimated kullanir ama JEST kullanmaz.
 */
export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Modal yalnizca acma akisinda mount edilir, kapanis animasyonu bitince unmount.
  const [mounted, setMounted] = useState(visible);

  // PanResponder bir kez kurulur; degisen her sey ref'ten okunur. Eskiden
  // onClose degistikce (ust bilesenin her cizimi) yeni bir PanResponder
  // uretiliyordu ve surukleme ortasinda el degistirebiliyordu.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const sheetHeightRef = useRef(SCREEN_HEIGHT * 0.5);
  const closingRef = useRef(false);
  const touchOriginRef = useRef<TouchOrigin>(null);
  const dragStartRef = useRef(0);
  const currentYRef = useRef(SCREEN_HEIGHT);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      currentYRef.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  const animateOpen = useCallback(
    (velocity = 0) => {
      closingRef.current = false;
      Animated.parallel([
        velocity
          ? Animated.spring(translateY, {
              toValue: 0,
              velocity,
              stiffness: 320,
              damping: 30,
              mass: 1,
              useNativeDriver: true,
            })
          : Animated.timing(translateY, {
              toValue: 0,
              duration: OPEN_DURATION,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: velocity ? 180 : OPEN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    [translateY, overlayOpacity],
  );

  /**
   * Kapanis animasyonu. Parmak hizla birakildiysa ayni hizla devam eder;
   * eskiden her kapanis yavas baslayan sabit bir egriydi ve savurma "takiliyor"
   * hissi veriyordu.
   */
  const animateClose = useCallback(
    (velocity = 0) => {
      closingRef.current = true;
      const target = sheetHeightRef.current + 40;
      const remaining = Math.max(0, target - currentYRef.current);
      const speed = Math.max(velocity, 1.4); // pt/ms
      const duration = Math.min(260, Math.max(140, remaining / speed));
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: target,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || !closingRef.current) return;
        closingRef.current = false;
        // Ust bilesen kapatmayi reddettiyse (visible hala true) pencere geri gelir.
        if (visibleRef.current) animateOpen();
        else setMounted(false);
      });
    },
    [translateY, overlayOpacity, animateOpen],
  );

  /** Kullanici kapatti (disari dokunma, geri tusu, surukleme): animasyon hemen baslar. */
  const requestClose = useCallback(
    (velocity = 0) => {
      if (closingRef.current) return;
      animateClose(velocity);
      onCloseRef.current();
    },
    [animateClose],
  );

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        // Once Modal cizilsin: native surucu animasyonu, gorunume baglanmamis bir
        // degerde baslatilirsa pencere ekrana hic gelmiyor. mounted true olunca
        // bu effect tekrar calisir ve acilisi baslatir.
        translateY.setValue(SCREEN_HEIGHT);
        overlayOpacity.setValue(0);
        setMounted(true);
        return;
      }
      animateOpen();
    } else if (mounted && !closingRef.current) {
      // Ust bilesen kendisi kapatti (or. secim yapildi).
      animateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted]);

  const shouldDrag = (g: PanResponderGestureState) => {
    if (closingRef.current) return false;
    const vertical = Math.abs(g.dy) > Math.abs(g.dx) * 1.3;
    if (!vertical || Math.abs(g.dy) < DRAG_SLOP) return false;
    const origin = touchOriginRef.current;
    if (origin === 'locked') return false;
    if (origin === null) return true;
    // Liste icinde: yalnizca liste en ustteyken ve parmak asagi giderken.
    return g.dy > 0 && origin.offset <= 0.5;
  };

  const settle = (g: PanResponderGestureState) => {
    const y = currentYRef.current;
    const height = sheetHeightRef.current;
    const flungDown = g.vy > CLOSE_VELOCITY && y > DRAG_SLOP;
    const pulledFar = y > height * CLOSE_RATIO && g.vy > -0.3;
    if (flungDown || pulledFar) {
      requestClose(Math.max(0, g.vy));
    } else {
      animateOpen(g.vy);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      // Dokunus basinda kok once calisir: kaynagi sifirla, cocuk liste kendi
      // onTouchStart'inda (kabarcik asamasi) kendini isaretler.
      onStartShouldSetPanResponderCapture: () => {
        touchOriginRef.current = null;
        return false;
      },
      onStartShouldSetPanResponder: () => false,
      // Capture: dugme ya da liste dokunusu ustlenmis olsa bile dikey cekiste
      // pencere devralir (dokunus iptal olur, yanlislikla secim yapilmaz).
      onMoveShouldSetPanResponderCapture: (_e: GestureResponderEvent, g) => shouldDrag(g),
      onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g) => shouldDrag(g),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        overlayOpacity.stopAnimation();
        dragStartRef.current = Math.max(0, currentYRef.current);
        Keyboard.dismiss();
      },
      onPanResponderMove: (_e, g) => {
        const raw = dragStartRef.current + g.dy;
        const height = sheetHeightRef.current;
        let y = raw;
        if (raw < 0) {
          // Lastik direnci: ne kadar cekilirse o kadar az esner, RUBBER_LIMIT'e yaklasir.
          const pull = -raw;
          y = -RUBBER_LIMIT * (1 - 1 / (1 + pull / (RUBBER_LIMIT * 2)));
        }
        translateY.setValue(y);
        overlayOpacity.setValue(Math.max(0, Math.min(1, 1 - y / height)));
      },
      onPanResponderRelease: (_e, g) => settle(g),
      onPanResponderTerminate: (_e, g) => settle(g),
    }),
  ).current;

  const scrollContext = useRef<SheetScrollContextValue>({
    setTouchOrigin: (origin) => {
      touchOriginRef.current = origin;
    },
  }).current;

  const handleSheetLayout = (event: LayoutChangeEvent) => {
    sheetHeightRef.current = event.nativeEvent.layout.height;
  };

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => requestClose()}
      statusBarTranslucent
    >
      <View style={styles.fill}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0,0,0,0.55)', opacity: overlayOpacity },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => requestClose()}
            accessibilityRole="button"
            accessibilityLabel={messages.common.close}
          />
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
            onLayout={handleSheetLayout}
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, transform: [{ translateY }] },
              Shadows.xl,
            ]}
            {...panResponder.panHandlers}
          >
            {/* Yukari esneyince altta bosluk acilmasin diye yuzey asagi uzatilir. */}
            <View
              pointerEvents="none"
              style={[styles.underlay, { backgroundColor: colors.surface }]}
            />
            <View style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
              {title ? (
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              ) : null}
            </View>
            <SheetScrollContext.Provider value={scrollContext}>{children}</SheetScrollContext.Provider>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * Pencere icindeki kaydirma alaninin konumunu pencereye bildirir. Pencere disinda
 * kullanilirsa (context yok) duz liste gibi davranir.
 */
function useSheetScrollTracking(
  lockSheetDrag: boolean,
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
  onTouchStart?: (event: GestureResponderEvent) => void,
) {
  const sheet = useContext(SheetScrollContext);
  const offsetRef = useRef({ offset: 0 });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current.offset = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      sheet?.setTouchOrigin(lockSheetDrag ? 'locked' : offsetRef.current);
      onTouchStart?.(event);
    },
    [sheet, lockSheetDrag, onTouchStart],
  );

  return { handleScroll, handleTouchStart };
}

interface SheetScrollExtraProps {
  /** true ise bu alanda dikey cekis pencereyi HIC tasimaz (or. tarih carki). */
  lockSheetDrag?: boolean;
}

export const BottomSheetScrollView = forwardRef<ScrollView, ScrollViewProps & SheetScrollExtraProps>(
  function BottomSheetScrollView({ lockSheetDrag = false, onScroll, onTouchStart, ...rest }, ref) {
    const { handleScroll, handleTouchStart } = useSheetScrollTracking(
      lockSheetDrag,
      onScroll,
      onTouchStart,
    );
    return (
      <ScrollView
        ref={ref}
        scrollEventThrottle={16}
        // En ustte asagi cekince liste esnemesin; o hareket pencereyi tasir.
        bounces={false}
        overScrollMode="never"
        {...rest}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
      />
    );
  },
);

export function BottomSheetFlatList<T>({
  lockSheetDrag = false,
  onScroll,
  onTouchStart,
  ...rest
}: FlatListProps<T> & SheetScrollExtraProps) {
  const { handleScroll, handleTouchStart } = useSheetScrollTracking(
    lockSheetDrag,
    onScroll,
    onTouchStart,
  );
  return (
    <FlatList
      scrollEventThrottle={16}
      bounces={false}
      overScrollMode="never"
      {...rest}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
    />
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
  underlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -RUBBER_LIMIT - 8,
    height: RUBBER_LIMIT + 8,
  },
  handleArea: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
});
