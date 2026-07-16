import { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Alt kutuyu (yorum/mesaj yazma alani) klavye acikken klavyenin TAM ustune,
 * kapaliyken `restingInset` kadar yukariya oturtur.
 *
 * Deger `useAnimatedKeyboard` ile UI thread'de aktigi icin gecis klavye
 * animasyonuyla birebir senkron olur. KeyboardAvoidingView JS thread'de
 * calisiyordu: klavyenin gerisinde kalip arada bir bosluk birakiyordu.
 * Ayni yontem messages/[username] ekraninda da kullaniliyor.
 *
 * Donen stil, KAYAN ICERIGI VE KUTUYU BIRLIKTE saran flex:1 kaba verilir.
 * Boylece kutu yukari cikarken icerik alani kisalir; kutu icerigin uzerine
 * binmedigi icin son satir da klavyenin altinda kaybolmaz.
 *
 * @param restingInset Klavye kapaliyken altta birakilacak bosluk. Tab bar'i
 * olan ekranlarda `useTabBarHeight()`, kok stack ekranlarinda `insets.bottom`.
 */
export function useKeyboardDock(restingInset: number) {
  const keyboard = useAnimatedKeyboard();

  return useAnimatedStyle(() => ({
    paddingBottom: Math.max(restingInset, keyboard.height.value),
  }));
}
