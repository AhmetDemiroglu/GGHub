import { useAnimatedStyle } from 'react-native-reanimated';
import { useAnimatedKeyboard } from 'react-native-keyboard-controller';

/**
 * Alt kutuyu (yorum/mesaj yazma alani) klavye acikken klavyenin TAM ustune,
 * kapaliyken `restingInset` kadar yukariya oturtur.
 *
 * Deger `useAnimatedKeyboard` ile UI thread'de aktigi icin gecis klavye
 * animasyonuyla birebir senkron olur. KeyboardAvoidingView JS thread'de
 * calisiyordu: klavyenin gerisinde kalip arada bir bosluk birakiyordu.
 * Ayni yontem messages/[username] ekraninda da kullaniliyor.
 *
 * `useAnimatedKeyboard` REANIMATED'DEN DEGIL keyboard-controller'dan gelir.
 * Reanimated'inki hem deprecate edildi hem de Android'de yuksekligi uygulama
 * genelinde TEK bir singleton'da (KeyboardAnimationManager.mKeyboard) tutup
 * unmount'ta sifirlamiyordu: klavye ACIKKEN bir ekran kapanirsa state OPEN ve
 * height ~300 donuyor, sonraki her tuketici klavye kapaliyken bile o bayat
 * degeri aliyordu. Bu ekranda sonuc, altta klavye kadar hayalet bosluk ve
 * ScrollView'in kisalmasiydi (yorumlar ekran disina tasiyordu).
 * kc'nin shim'i height/state'i HOOK ORNEGI BASINA useSharedValue ile tutar,
 * paylasilan state yoktur. Reanimated'inkine geri donulmemeli.
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
