import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
// RN'inki degil: Android'de Modal icinde no-op. Bkz. common/BottomSheet import notu.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { Avatar } from '@/src/components/common/Avatar';
import { AiBadge } from '@/src/components/common/AiBadge';
import { MentionText, parseMentions } from '@/src/components/common/MentionText';
import {
  MentionSuggestionStrip,
  useMentionSuggestions,
} from '@/src/components/common/mention-suggestions';
import { formatTimeAgo } from '@/src/utils/format';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import type { ThreadComment } from './CommentThreadItem';

const MAX_LENGTH = 1000;
const AVATAR_SIZE = 36;

export interface ReplyComposerModalProps {
  visible: boolean;
  /** Yanit verilen yorum; pencerenin ustunde alinti olarak cizilir. */
  target: ThreadComment;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isSending: boolean;
}

/**
 * Bir yoruma yanit yazma penceresi (X davranisi).
 *
 * Eskiden "Yanitla" yorumun ALTINDA ikinci bir yazma kutusu aciyordu; alttaki
 * sabit kok yorum kutusuyla ayni anda iki input gorunuyordu ve klavye hangisine
 * ait belli degildi. Artik yanit tam ekran bir pencerede yazilir: ustte
 * yanitlanan yorum, altinda kullanicinin kutusu, klavye dogrudan acik. Alttaki
 * kok kutu hic degismez, listeye yorum yazmak her zaman oradan yapilir.
 *
 * Iptal taslagi SILMEZ: metin CommentThreadItem'da durur, ayni yoruma tekrar
 * "Yanitla" denince geri gelir. Pencere ustune onay diyalogu acmak iOS'ta
 * ic ice Modal gerektirirdi; taslagi tutmak ayni korumayi surtunmesiz verir.
 */
export function ReplyComposerModal({
  visible,
  target,
  value,
  onChangeText,
  onSend,
  onCancel,
  isSending,
}: ReplyComposerModalProps) {
  const { colors, isDark } = useTheme();
  const { messages } = useLocale();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const t = messages.commentsSection;
  // MentionText/CommentComposer ile ayni ton.
  const mentionAccent = isDark ? colors.primaryLight : colors.primary;

  const { suggestions, selectSuggestion, handleSelectionChange } = useMentionSuggestions({
    value,
    onChangeText,
  });

  const canSend = value.trim().length > 0 && !isSending;
  const owner = target.owner;
  const [replyingBefore, replyingAfter = ''] = t.replyingTo.split('{username}');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      // autoFocus Android'de Modal acilis animasyonu sirasinda bazen klavyeyi
      // acmiyor; pencere gorundukten sonra odak bir kez daha istenir.
      onShow={() => inputRef.current?.focus()}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={onCancel}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={messages.common.cancel}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>{messages.common.cancel}</Text>
          </Pressable>
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary, opacity: canSend || isSending ? 1 : 0.5 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.reply}
            accessibilityState={{ disabled: !canSend, busy: isSending }}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.sendText}>{t.reply}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.lg }]}
        >
          <View style={styles.row}>
            <View style={styles.rail}>
              <Avatar uri={owner.profileImageUrl} name={owner.username} size={AVATAR_SIZE} />
              <View style={[styles.threadLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.main}>
              <View style={styles.metaRow}>
                <Text style={[styles.handle, { color: colors.text }]} numberOfLines={1}>
                  @{owner.username}
                </Text>
                {owner.isAiAgent ? <AiBadge /> : null}
                <Text style={[styles.time, { color: colors.textMuted }]}>
                  {' · '}
                  {formatTimeAgo(target.createdAt)}
                </Text>
              </View>
              {/* Uzun yorum yazma kutusunu ekrandan itmesin diye kirpilir. Bahisler
                  dokunulmaz: pencerenin arkasina profil acmak kullaniciyi kaybettirir. */}
              <MentionText
                body={target.content}
                linkify={false}
                numberOfLines={6}
                style={[styles.quote, { color: colors.text }]}
              />
              <Text style={[styles.replyingTo, { color: colors.textMuted }]}>
                {replyingBefore}
                <Text style={{ color: mentionAccent }}>@{owner.username}</Text>
                {replyingAfter}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rail}>
              <Avatar uri={user?.profileImageUrl} name={user?.username} size={AVATAR_SIZE} />
            </View>
            {/* value yerine cocuk <Text>'ler: bahisler yazarken de renkli gorunsun.
                Gerekce icin bkz. CommentComposer / MentionInput. */}
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              onChangeText={onChangeText}
              onSelectionChange={handleSelectionChange}
              placeholder={t.replyPlaceholder}
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={MAX_LENGTH}
              autoFocus
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
          </View>
        </ScrollView>

        {/* Oneri seridi klavyenin hemen ustunde, X'in arac cubugunun yerinde. */}
        <MentionSuggestionStrip
          suggestions={suggestions}
          onSelect={selectSuggestion}
          style={[styles.suggestions, { borderTopColor: colors.border }]}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  cancelText: {
    fontSize: FontSize.lg,
  },
  sendButton: {
    minWidth: 88,
    minHeight: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  rail: {
    width: AVATAR_SIZE,
    alignItems: 'center',
  },
  threadLine: {
    flex: 1,
    width: 2,
    marginVertical: Spacing.xs,
    borderRadius: 1,
  },
  main: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  handle: {
    flexShrink: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  time: {
    fontSize: FontSize.sm,
  },
  quote: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  replyingTo: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.lg,
    lineHeight: 22,
    minHeight: 96,
    // Ilk satir avatarin ortasina hizalansin.
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  suggestions: {
    borderBottomWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
  },
});
