import React, { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { MentionText } from '@/src/components/common/MentionText';
import { useTheme } from '@/src/hooks/use-theme';
import { MentionTargetType, type PostMention } from '@/src/models/post';

/**
 * Gonderi metnindeki TIPLI etiket token'i. Backend'deki
 * GGHub.Core/Specifications/MentionTokens.PatternSource ile AYNI olmali.
 *
 * Lookbehind YOK: Hermes her surumde desteklemiyor ve regex literal'i parse
 * edilemezse modul yuklenirken patlar (MentionText'teki ayni gerekce).
 */
const TOKEN_REGEX = /@\[(u|g|l):(\d{1,10})\]/g;

const PREFIX_TO_TYPE: Record<string, MentionTargetType> = {
  u: MentionTargetType.User,
  g: MentionTargetType.Game,
  l: MentionTargetType.List,
};

type Part =
  | { kind: 'text'; value: string; key: string }
  | { kind: 'mention'; mention: PostMention | null; key: string };

function parse(body: string, mentions: PostMention[]): Part[] {
  const parts: Part[] = [];
  let lastIndex = 0;
  let tokenIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(body)) !== null) {
    const start = match.index;
    const plain = body.slice(lastIndex, start);
    if (plain) parts.push({ kind: 'text', value: plain, key: `t${start}` });

    const type = PREFIX_TO_TYPE[match[1]];
    const targetId = Number(match[2]);
    // Sunucu etiketleri metindeki sirayla donuyor; ayni sira burada da gecerli.
    const candidate = mentions[tokenIndex++];
    const isMatch = candidate && candidate.type === type && candidate.id === targetId;

    parts.push({
      kind: 'mention',
      mention: isMatch && candidate.resolved ? candidate : null,
      key: `m${start}`,
    });

    lastIndex = start + match[0].length;
    if (TOKEN_REGEX.lastIndex === start) TOKEN_REGEX.lastIndex++;
  }

  const tail = body.slice(lastIndex);
  if (tail) parts.push({ kind: 'text', value: tail, key: `t${lastIndex}` });

  return parts;
}

interface PostTextProps {
  body: string;
  mentions: PostMention[];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /**
   * false ise etiketler boyanir ama dokunulamaz. Dokunulabilir kart icindeki
   * onizlemeler icin: ic ice onPress kartin kendi dokunusuyla catisir.
   */
  linkify?: boolean;
}

/**
 * Gonderi govdesi.
 *
 * Iki gecis ve SIRASI onemli:
 *   1. Tipli token'lar ("@[g:340]") cozulmus ada ve renkli metne cevrilir.
 *   2. Aralarda kalan duz metin MentionText'e verilir; boylece kullanicinin
 *      acilir listeden secmeden elle yazdigi "@ahmet" yine linklenir ve
 *      incelemelerdeki mevcut davranis birebir korunur.
 *
 * Cozulemeyen token duz gri metne duser; hedefin adi istemcide HIC tutulmadigi
 * icin gizli bir liste/profil adi sizmaz.
 */
export function PostText({ body, mentions, style, numberOfLines, linkify = true }: PostTextProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const parts = useMemo(() => parse(body ?? '', mentions), [body, mentions]);

  const colorFor = (type: MentionTargetType) => {
    if (type === MentionTargetType.Game) return colors.mentionGame;
    if (type === MentionTargetType.List) return colors.mentionList;
    return isDark ? colors.primaryLight : colors.primary;
  };

  const open = (mention: PostMention) => {
    if (mention.type === MentionTargetType.User) {
      router.push(`/profiles/${mention.slug ?? mention.display}` as never);
    } else if (mention.type === MentionTargetType.Game) {
      // Mobilde oyun rotasi /game/[id] (web'de /games/[slug]); toMobileRoute
      // ayni donusumu yapiyor, burada dogrudan mobil bicim yaziliyor.
      router.push(`/game/${mention.slug ?? mention.id}` as never);
    } else {
      router.push(`/lists/${mention.id}` as never);
    }
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part) => {
        if (part.kind === 'text') {
          return (
            <MentionText key={part.key} body={part.value} style={style} linkify={linkify} />
          );
        }

        if (!part.mention) {
          return (
            <Text key={part.key} style={{ color: colors.textMuted }}>
              @?
            </Text>
          );
        }

        const mention = part.mention;
        const mentionStyle = { color: colorFor(mention.type), fontWeight: '600' as const };

        return linkify ? (
          <Text key={part.key} style={mentionStyle} onPress={() => open(mention)}>
            @{mention.display}
          </Text>
        ) : (
          <Text key={part.key} style={mentionStyle}>
            @{mention.display}
          </Text>
        );
      })}
    </Text>
  );
}
