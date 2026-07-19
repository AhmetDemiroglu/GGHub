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

export type MentionPart =
  | { kind: 'text'; value: string; key: string }
  | { kind: 'mention'; username: string; key: string };

type Part = MentionPart;

/** Composer (MentionInput) da ayni bolmeyi kullanir; tek kaynak. */
export function parseMentions(body: string): Part[] {
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
  /**
   * false ise bahis boyanir ama DOKUNULABILIR OLMAZ. Dokunulabilir bir kartin
   * icindeki kirpilmis onizlemeler icin: orada ic ice onPress, kartin kendi
   * dokunusuyla catisir ve kullanici yanlislikla profile duser.
   */
  linkify?: boolean;
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
export function MentionText({ body, style, mentionStyle, numberOfLines, linkify = true }: MentionTextProps) {
  const { colors, isDark } = useTheme();
  const parts = useMemo(() => parseMentions(body ?? ''), [body]);

  // Koyu temada primary (#6366f1) koyu zeminde sonuk kaliyor; bir ton acigi
  // kullaniliyor. Web'deki --mention token'i da ayni iki degeri tasiyor.
  const accent = isDark ? colors.primaryLight : colors.primary;
  const mentionStyles = [{ color: accent, fontWeight: '600' as const }, mentionStyle];

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part) =>
        part.kind === 'text' ? (
          <Text key={part.key}>{part.value}</Text>
        ) : linkify ? (
          <UserLinkMention key={part.key} username={part.username} style={mentionStyles} />
        ) : (
          <Text key={part.key} style={mentionStyles}>
            @{part.username}
          </Text>
        ),
      )}
    </Text>
  );
}
