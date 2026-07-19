import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { parseMentions } from '@/src/components/common/MentionText';
import {
  MentionSuggestionStrip,
  useMentionSuggestions,
} from '@/src/components/common/mention-suggestions';

interface MentionInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  numberOfLines?: number;
  editable?: boolean;
  autoFocus?: boolean;
  /** TextInput'un kendi stili. */
  style?: StyleProp<TextStyle>;
  /** Oneri seridi + input'u saran dis kap. */
  containerStyle?: StyleProp<ViewStyle>;
  textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
}

/**
 * "@" tetikleyicili TextInput. Oneri seridini input'un HEMEN USTUNDE, kendi
 * kabinin ICINDE cizer.
 *
 * Serit acilip kapandikca bu kabin yuksekligi degisir. Bu, input'un kendisi bir
 * cerceve ise (ReviewModal) sorun degildir; ama cagiran taraf MentionInput'u
 * cerceveli bir "hap" satirinin icine koyuyorsa serit hapi yazarken sisirir.
 * Yorum yazma kutulari bu yuzden MentionInput'u DEGIL, seridi hapin disina
 * cikaran CommentComposer'i kullanir.
 */
export function MentionInput({
  value,
  onChangeText,
  placeholder,
  multiline = true,
  maxLength,
  numberOfLines,
  editable = true,
  autoFocus,
  style,
  containerStyle,
  textAlignVertical,
}: MentionInputProps) {
  const { colors, isDark } = useTheme();
  const { suggestions, selectSuggestion, handleSelectionChange } = useMentionSuggestions({
    value,
    onChangeText,
    editable,
  });

  /**
   * Yazarken canli vurgulama. RN'de TextInput'un ICERIGI cocuk <Text>'lerle
   * verilebilir ve her parca ayri stillenebilir; boylece kullanici GONDERMEDEN
   * once de etiketinin tutup tutmadigini gorur.
   *
   * `value` prop'u BILEREK verilmiyor: cocuklar zaten value'dan turetiliyor,
   * yani alan hala kontrollu. Ikisi birden verilirse icerik iki kaynaktan
   * beslenir ve imlec ziplar. Gonderim sonrasi value='' gelince cocuklar da
   * bosalir, alan temizlenir.
   *
   * Renk MentionText ile ayni: koyu temada primaryLight, acikta primary.
   */
  const accent = isDark ? colors.primaryLight : colors.primary;
  const children = useMemo(
    () =>
      parseMentions(value ?? '').map((part) =>
        part.kind === 'mention' ? (
          <Text key={part.key} style={{ color: accent, fontWeight: '600' }}>
            @{part.username}
          </Text>
        ) : (
          <Text key={part.key}>{part.value}</Text>
        ),
      ),
    [value, accent],
  );

  return (
    <View style={containerStyle}>
      <MentionSuggestionStrip suggestions={suggestions} onSelect={selectSuggestion} />

      <TextInput
        style={style}
        onChangeText={onChangeText}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        multiline={multiline}
        maxLength={maxLength}
        numberOfLines={numberOfLines}
        editable={editable}
        autoFocus={autoFocus}
        textAlignVertical={textAlignVertical}
      >
        {children}
      </TextInput>
    </View>
  );
}
