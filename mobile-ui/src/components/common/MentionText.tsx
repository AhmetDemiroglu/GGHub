import React, { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { UserLinkMention } from '@/src/components/common/UserLink';

/**
 * Backend'deki MentionService.MentionRegex'in AYNISI, ama lookbehind'siz.
 *
 * Neden lookbehind yok: Hermes (RN'in JS motoru) lookbehind'i her surumde
 * desteklemiyor; regex literal'i parse edilemezse modul YUKLENIRKEN patlar.
 * Bu yuzden onceki karakter bir yakalama grubuna alinir ve render'da geri basilir.
 *   Grup 1 = "@"den onceki karakter (satir basiysa bos string)
 *   Grup 2 = handle
 *
 * Bastaki karakter kapisi ("@"in solunda ad karakteri olmamali) "a@b.com" gibi
 * e-postalarin "@b.com" olarak yakalanmasini engeller. \p{L}/\p{N} kullanilir,
 * \w degil: kullanici adlarinda ASCII disi harfler ("ömer", "şule") gecerlidir.
 */
const MENTION_REGEX = /(^|[^\p{L}\p{N}_.])@([\p{L}\p{N}_.]{3,30})/gu;

type Part =
  | { kind: 'text'; value: string; key: string }
  | { kind: 'mention'; username: string; key: string };

function parseMentions(body: string): Part[] {
  const parts: Part[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // exec + /g durum tasidigi icin regex her cagrida sifirlanir.
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(body)) !== null) {
    const [full, leading, username] = match;
    const start = match.index;

    // Eslesmeden onceki duz metin + eslesmenin ilk karakteri (grup 1) geri basilir:
    // o karakter bahsin parcasi degil, sadece kapinin bekcisi.
    const plain = body.slice(lastIndex, start) + leading;
    if (plain) {
      parts.push({ kind: 'text', value: plain, key: `t${start}` });
    }

    parts.push({ kind: 'mention', username, key: `m${start}` });
    lastIndex = start + full.length;

    // Sifir uzunluklu eslesme teorik olarak sonsuz donguye sokar; emniyet kemeri.
    if (MENTION_REGEX.lastIndex === start) MENTION_REGEX.lastIndex++;
  }

  const tail = body.slice(lastIndex);
  if (tail) {
    parts.push({ kind: 'text', value: tail, key: `t${lastIndex}` });
  }

  return parts;
}

interface MentionTextProps {
  body: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Bir gonderi/yorum govdesini render eder ve "@handle" parcalarini profile
 * giden dokunulabilir metne cevirir.
 *
 * Linkleme IYIMSERDIR: istemci hangi handle'in gercek bir kullaniciya karsilik
 * geldigini bilmez. Bu guvenlidir, cunku /profiles/{olmayan} ile
 * /profiles/{gizli} ayni sekilde 404 verir; yani linkin varligindan bir hesabin
 * var oldugu ya da gizli oldugu ANLASILAMAZ. Hicbir sey sizmaz.
 */
export function MentionText({ body, style, mentionStyle, numberOfLines }: MentionTextProps) {
  const { colors } = useTheme();
  const parts = useMemo(() => parseMentions(body ?? ''), [body]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part) =>
        part.kind === 'text' ? (
          <Text key={part.key}>{part.value}</Text>
        ) : (
          <UserLinkMention
            key={part.key}
            username={part.username}
            style={[{ color: colors.primary, fontWeight: '600' }, mentionStyle]}
          />
        ),
      )}
    </Text>
  );
}
