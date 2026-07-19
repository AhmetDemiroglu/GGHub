import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { parseMentions } from '@/src/components/common/MentionText';
import {
  MentionSuggestionStrip,
  useMentionSuggestions,
} from '@/src/components/common/mention-suggestions';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

const MAX_LENGTH = 1000;

export interface CommentComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onSend: () => void;
  /** Gonderim surerken: buton spinner'a doner ve tekrar basilamaz. */
  isSending?: boolean;
  autoFocus?: boolean;
  /** Yanit kutusu kok kutudan bir tik kucuk cizilir. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Yorum/yanit yazma kutusu.
 *
 * Oneri seridi bilerek cerceveli hapin DISINDA, ustunde durur: seridin iceride
 * cizildigi eski duzende "@a" yazar yazmaz hap ~40px sisiyor, silince geri
 * iniyordu; satir alignItems:'flex-end' oldugu icin gonder butonu asagida
 * sabit kalirken input ziplyordu. Serit disarida oldugunda hapin yuksekligi
 * yazarken sabit kalir.
 */
export function CommentComposer({
  value,
  onChangeText,
  placeholder,
  onSend,
  isSending = false,
  autoFocus,
  compact = false,
  style,
}: CommentComposerProps) {
  const { colors, isDark } = useTheme();
  // MentionText/MentionInput ile ayni ton.
  const mentionAccent = isDark ? colors.primaryLight : colors.primary;
  const { messages } = useLocale();
  const t = messages.commentsSection;

  const { suggestions, selectSuggestion, handleSelectionChange } = useMentionSuggestions({
    value,
    onChangeText,
  });

  const canSend = value.trim().length > 0 && !isSending;

  return (
    <View style={style}>
      <MentionSuggestionStrip suggestions={suggestions} onSelect={selectSuggestion} />

      <View
        style={[
          styles.pill,
          compact && styles.pillCompact,
          { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
        ]}
      >
        {/* value yerine cocuk <Text>'ler: bahisler yazarken de renkli gorunsun.
            Gerekce ve kontrollu kalma detayi icin bkz. MentionInput. */}
        <TextInput
          style={[styles.input, { color: colors.text }]}
          onChangeText={onChangeText}
          onSelectionChange={handleSelectionChange}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={MAX_LENGTH}
          autoFocus={autoFocus}
        >
          {parseMentions(value ?? '').map((part) =>
            part.kind === 'mention' ? (
              <Text key={part.key} style={{ color: mentionAccent, fontWeight: '600' }}>
                @{part.username}
              </Text>
            ) : (
              <Text key={part.key}>{part.value}</Text>
            ),
          )}
        </TextInput>
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          style={styles.sendButton}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t.send}
          accessibilityState={{ disabled: !canSend }}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="send"
              size={compact ? 18 : 20}
              color={value.trim() ? colors.primary : colors.textMuted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pillCompact: {
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    maxHeight: 96,
    // minHeight, tek satirlik input'un gonder butonuyla ayni yuksekligi
    // tutmasini saglar; olmazsa hap ilk satirda gonder butonundan kisa kalir.
    minHeight: 24,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendButton: {
    paddingLeft: Spacing.md,
    paddingBottom: 2,
  },
});
