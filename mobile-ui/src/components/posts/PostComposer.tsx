import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { createPost, searchMentionTargets, uploadPostImage } from '@/src/api/post';
import { Avatar } from '@/src/components/common/Avatar';
import { Button } from '@/src/components/common/Button';
import { useToast } from '@/src/components/common/Toast';
import { PollEditor, type PollDraft } from '@/src/components/posts/PollEditor';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { useDebounce } from '@/src/hooks/use-debounce';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { shrinkForUpload } from '@/src/utils/image';
import * as haptics from '@/src/utils/haptics';
import {
  MentionTargetType,
  POLL_MIN_OPTIONS,
  POST_MAX_IMAGES,
  POST_MAX_LENGTH,
  type MentionSuggestion,
  type Post,
} from '@/src/models/post';

/**
 * Caret'in solunda yazilmakta olan "@..." parcasi. Oyun ve liste adlari BOSLUK
 * icerdigi icin desen bosluga izin verir. Ust sinir kisa (30), yoksa cumlenin
 * tamami sorgu haline gelirdi.
 *
 * Lookbehind YOK: Hermes desteklemeyebilir ve regex literal'i parse edilemezse
 * modul yuklenirken patlar (MentionText'teki ayni gerekce).
 */
const ACTIVE_MENTION_PATTERN = /(^|[^\p{L}\p{N}_.])@([^\n@]{0,30})$/u;

const POST_IMAGE_MAX_EDGE = 1280;

/** Composer'da secilmis bir etiket: gorunen metin + token'a cevrilecek hedef. */
interface PickedMention {
  text: string;
  type: MentionTargetType;
  id: number;
}

interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

interface PostComposerProps {
  parentPostId?: number;
  placeholder?: string;
  autoFocus?: boolean;
  onCreated?: (post: Post) => void;
}

/**
 * Gonderi olusturma alani.
 *
 * Kullanici DUZ metin gorur ("@Elden Ring"), sunucuya TOKEN gider ("@[g:340]").
 * Cevrim gonderme aninda yapiliyor; token'i girdi alaninda tutmak ya kullaniciya
 * "@[g:340]" gostermeyi ya da metin genisligi tutmayan bir vurgu katmani
 * kurmayi gerektirirdi.
 *
 * Kullanici secilmis bir adi elle bozarsa etiket token'a cevrilemez ve duz
 * metin olarak kalir: yanlis hedefe link verilmez, veri bozulmaz.
 */
export function PostComposer({ parentPostId, placeholder, autoFocus, onCreated }: PostComposerProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const inputRef = useRef<TextInput | null>(null);
  const anchorRef = useRef<{ start: number; end: number } | null>(null);
  const selectionRef = useRef(0);

  const [value, setValue] = useState('');
  const [picked, setPicked] = useState<PickedMention[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const debouncedQuery = useDebounce(mentionQuery, 250);
  const isQueryable = !!debouncedQuery && debouncedQuery.trim().length >= 1;

  const { data: candidates, isFetching } = useQuery({
    queryKey: ['mention-targets', debouncedQuery],
    queryFn: () => searchMentionTargets(debouncedQuery as string),
    enabled: isQueryable,
    staleTime: 30_000,
  });

  const suggestions = isQueryable ? (candidates ?? []) : [];
  const isOpen = mentionQuery !== null && mentionQuery.trim().length >= 1;

  const length = value.length;
  const isOverLimit = length > POST_MAX_LENGTH;
  const hasPoll = poll !== null && poll.options.filter((o) => o.trim()).length >= POLL_MIN_OPTIONS;
  const canSubmit =
    isAuthenticated && !isOverLimit && (value.trim().length > 0 || images.length > 0 || hasPoll);

  const colorFor = (type: MentionTargetType) => {
    if (type === MentionTargetType.Game) return colors.mentionGame;
    if (type === MentionTargetType.List) return colors.mentionList;
    return colors.primary;
  };

  const typeLabel = (type: MentionTargetType) => {
    if (type === MentionTargetType.Game) return messages.posts.mention.game;
    if (type === MentionTargetType.List) return messages.posts.mention.list;
    return messages.posts.mention.person;
  };

  const closeSuggestions = useCallback(() => {
    anchorRef.current = null;
    setMentionQuery(null);
  }, []);

  const syncMentionState = useCallback(
    (text: string, caret: number) => {
      const match = ACTIVE_MENTION_PATTERN.exec(text.slice(0, caret));
      if (!match) {
        closeSuggestions();
        return;
      }
      anchorRef.current = { start: match.index + match[1].length, end: caret };
      setMentionQuery(match[2]);
    },
    [closeSuggestions],
  );

  const insertMention = (suggestion: MentionSuggestion) => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const insertion = `@${suggestion.display}`;
    const next = `${value.slice(0, anchor.start)}${insertion} ${value.slice(anchor.end)}`;

    haptics.selection();
    setPicked((prev) => [...prev, { text: insertion, type: suggestion.type, id: suggestion.id }]);
    setValue(next);
    closeSuggestions();
  };

  /**
   * Gorunen metni token'li metne cevirir. Her secilmis etiket metinde SIRAYLA
   * aranir ve ilk tuketilmemis gecisi token ile degistirilir. Kullanici o
   * parcayi silmis ya da bozmussa bulunamaz; etiket duz metin olarak kalir.
   */
  const toTokenizedContent = (): string => {
    let output = '';
    let cursor = 0;
    const remaining = [...picked];

    while (cursor < value.length) {
      let bestIndex = -1;
      let bestAt = Number.MAX_SAFE_INTEGER;

      for (let i = 0; i < remaining.length; i++) {
        const at = value.indexOf(remaining[i].text, cursor);
        if (at !== -1 && at < bestAt) {
          bestAt = at;
          bestIndex = i;
        }
      }

      if (bestIndex === -1) break;

      const hit = remaining[bestIndex];
      const prefix =
        hit.type === MentionTargetType.User ? 'u' : hit.type === MentionTargetType.Game ? 'g' : 'l';
      output += value.slice(cursor, bestAt) + `@[${prefix}:${hit.id}]`;
      cursor = bestAt + hit.text.length;
      remaining.splice(bestIndex, 1);
    }

    return output + value.slice(cursor);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createPost({
        content: value.trim().length > 0 ? toTokenizedContent() : null,
        imageUrls: images.map((i) => i.url),
        poll: hasPoll
          ? {
              options: poll!.options.map((o) => o.trim()).filter(Boolean),
              durationDays: poll!.durationDays,
            }
          : null,
        parentPostId: parentPostId ?? null,
      }),
    onSuccess: (post) => {
      haptics.success();
      setValue('');
      setPicked([]);
      setImages([]);
      setPoll(null);
      showToast('success', parentPostId ? messages.posts.replySent : messages.posts.created);
      onCreated?.(post);
    },
    onError: () => showToast('error', messages.posts.createError),
  });

  const pickImages = async () => {
    const room = POST_MAX_IMAGES - images.length;
    if (room <= 0) {
      showToast('error', messages.posts.imageLimit.replace('{count}', String(POST_MAX_IMAGES)));
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      const uploads = await Promise.all(
        result.assets.map(async (asset) =>
          uploadPostImage(await shrinkForUpload(asset, POST_IMAGE_MAX_EDGE)),
        ),
      );
      setImages((prev) => [...prev, ...uploads]);
    } catch {
      showToast('error', messages.posts.imageUploadError);
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Avatar uri={user?.profileImageUrl ?? null} name={user?.username ?? '?'} size={38} />

        <View style={styles.body}>
          <TextInput
            ref={inputRef}
            value={value}
            autoFocus={autoFocus}
            multiline
            placeholder={placeholder ?? messages.posts.placeholder}
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { color: colors.text }]}
            onChangeText={(text) => {
              setValue(text);
              syncMentionState(text, selectionRef.current || text.length);
            }}
            onSelectionChange={(event) => {
              selectionRef.current = event.nativeEvent.selection.start;
              syncMentionState(value, event.nativeEvent.selection.start);
            }}
          />

          {isOpen && (isFetching || suggestions.length > 0) ? (
            <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {suggestions.length === 0 && isFetching ? (
                <View style={styles.suggestionLoading}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                </View>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.suggestionScroll}>
                  {suggestions.map((candidate) => (
                    <Pressable
                      key={`${candidate.type}-${candidate.id}`}
                      onPress={() => insertMention(candidate)}
                      style={styles.suggestionRow}
                    >
                      {candidate.imageUrl ? (
                        <Image source={{ uri: candidate.imageUrl }} style={styles.suggestionImage} />
                      ) : (
                        <View style={[styles.suggestionImage, { backgroundColor: colors.surfaceHighlight }]} />
                      )}
                      <View style={styles.suggestionText}>
                        <Text
                          style={[styles.suggestionTitle, { color: colorFor(candidate.type) }]}
                          numberOfLines={1}
                        >
                          {candidate.display}
                        </Text>
                        <Text style={[styles.suggestionSub, { color: colors.textSecondary }]} numberOfLines={1}>
                          {typeLabel(candidate.type)}
                          {candidate.subtitle ? ` · ${candidate.subtitle}` : ''}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}

          {images.length > 0 ? (
            <View style={styles.imageRow}>
              {images.map((image, index) => (
                <View key={image.url} style={styles.imageThumbWrap}>
                  <Image source={{ uri: image.url }} style={styles.imageThumb} />
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    style={styles.imageRemove}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={12} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {poll ? <PollEditor draft={poll} onChange={setPoll} onRemove={() => setPoll(null)} /> : null}

          <View style={styles.toolbar}>
            <Pressable
              onPress={pickImages}
              disabled={images.length >= POST_MAX_IMAGES || poll !== null || uploading}
              style={styles.toolButton}
              hitSlop={6}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={images.length >= POST_MAX_IMAGES || poll !== null ? colors.textMuted : colors.primary}
                />
              )}
            </Pressable>

            <Pressable
              onPress={() => setPoll({ options: ['', ''], durationDays: 1 })}
              disabled={poll !== null || images.length > 0}
              style={styles.toolButton}
              hitSlop={6}
            >
              <Ionicons
                name="stats-chart-outline"
                size={19}
                color={poll !== null || images.length > 0 ? colors.textMuted : colors.primary}
              />
            </Pressable>

            <Text
              style={[
                styles.counter,
                { color: isOverLimit ? colors.error : colors.textSecondary, fontWeight: isOverLimit ? '700' : '400' },
              ]}
            >
              {length}/{POST_MAX_LENGTH}
            </Text>

            <Button
              title={parentPostId ? messages.posts.reply : messages.posts.share}
              size="sm"
              onPress={() => createMutation.mutate()}
              disabled={!canSubmit || uploading}
              loading={createMutation.isPending}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    fontSize: FontSize.md,
    minHeight: 44,
    maxHeight: 140,
    paddingTop: Spacing.xs,
    textAlignVertical: 'top',
  },
  suggestions: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  suggestionScroll: {
    maxHeight: 200,
  },
  suggestionLoading: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  suggestionImage: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
  },
  suggestionText: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  suggestionSub: {
    fontSize: FontSize.xs,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  imageThumbWrap: {
    position: 'relative',
  },
  imageThumb: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  imageRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  toolButton: {
    padding: Spacing.xs,
  },
  counter: {
    marginLeft: 'auto',
    fontSize: FontSize.xs,
  },
});
