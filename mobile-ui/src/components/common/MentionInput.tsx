import React from 'react';
import {
  View,
  TextInput,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
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
  const { colors } = useTheme();
  const { suggestions, selectSuggestion, handleSelectionChange } = useMentionSuggestions({
    value,
    onChangeText,
    editable,
  });

  return (
    <View style={containerStyle}>
      <MentionSuggestionStrip suggestions={suggestions} onSelect={selectSuggestion} />

      <TextInput
        style={style}
        value={value}
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
      />
    </View>
  );
}
