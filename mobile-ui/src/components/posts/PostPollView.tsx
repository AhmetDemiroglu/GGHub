import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';

import { votePostPoll } from '@/src/api/post';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useTheme } from '@/src/hooks/use-theme';
import { useToast } from '@/src/components/common/Toast';
import * as haptics from '@/src/utils/haptics';
import type { PostPoll } from '@/src/models/post';

interface PostPollViewProps {
  postId: number;
  poll: PostPoll;
  /** Anonim kullanici oy veremez. */
  canVote: boolean;
}

/**
 * Anket. Sonuclar YALNIZCA oy verildikten ya da anket kapandiktan sonra
 * gosterilir (X davranisi): erken gosterilen sonuc oyu yonlendirir.
 */
export function PostPollView({ postId, poll: incomingPoll, canVote }: PostPollViewProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { showToast } = useToast();
  const [poll, setPoll] = useState(incomingPoll);

  // Sunucudan TAZE anket geldiginde yerel kopya ona teslim olur.
  //
  // Onceden yalnizca `useState(initialPoll)` vardi ve ilk deger disindaki hicbir
  // prop guncellemesi ice alinmiyordu. Akis once React Query'nin BAYAT kopyasiyla
  // ciziliyor (0 oy, myOptionId null), arkadan gelen dogru cevap ise yutuluyordu:
  // oy verilmis anket ana akista sonucsuz gorunuyordu, detay sayfasi ise ayni
  // gonderiyi tek basina cektigi icin dogru gosteriyordu.
  //
  // Karsilastirma KIMLIK uzerinden: yalnizca gercekten yeni bir nesne geldiginde
  // (refetch) senkronlanir. Web ana akisi listeyi kendi state'inde tuttugu ve ayni
  // nesneyi tekrar tekrar gecirdigi icin, oy sonrasi yerel sonuc ezilmez.
  const [syncedFrom, setSyncedFrom] = useState(incomingPoll);
  if (incomingPoll !== syncedFrom) {
    setSyncedFrom(incomingPoll);
    setPoll(incomingPoll);
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (optionId: number) => votePostPoll(postId, optionId),
    onSuccess: (updated) => {
      haptics.success();
      setPoll(updated);
    },
    onError: () => showToast('error', messages.posts.poll.voteError),
  });

  const hasVoted = poll.myOptionId != null;
  const showResults = hasVoted || poll.isClosed;

  const remaining = () => {
    if (poll.isClosed) return messages.posts.poll.closed;

    const ms = new Date(poll.endsAt).getTime() - Date.now();
    if (ms <= 0) return messages.posts.poll.closed;

    const hours = Math.floor(ms / 3_600_000);
    if (hours >= 24) return messages.posts.poll.daysLeft.replace('{count}', String(Math.floor(hours / 24)));
    if (hours >= 1) return messages.posts.poll.hoursLeft.replace('{count}', String(hours));
    return messages.posts.poll.minutesLeft.replace('{count}', String(Math.max(1, Math.floor(ms / 60_000))));
  };

  const sorted = [...poll.options].sort((a, b) => a.position - b.position);

  return (
    <View style={styles.wrap}>
      {sorted.map((option) => {
        const percent = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
        const isMine = poll.myOptionId === option.id;

        if (!showResults) {
          return (
            <Pressable
              key={option.id}
              disabled={!canVote || isPending}
              onPress={() => {
                haptics.selection();
                mutate(option.id);
              }}
              style={[
                styles.optionButton,
                { borderColor: colors.primary, opacity: canVote && !isPending ? 1 : 0.6 },
              ]}
            >
              <Text style={[styles.optionButtonText, { color: colors.primary }]}>{option.text}</Text>
            </Pressable>
          );
        }

        return (
          <View key={option.id} style={[styles.resultRow, { borderColor: colors.border }]}>
            {/* Dolgu cubugu metnin ARKASINDA: yuzde degistikce metin kaymasin. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  width: `${percent}%`,
                  backgroundColor: isMine ? colors.primary + '40' : colors.surfaceHighlight,
                },
              ]}
              pointerEvents="none"
            />
            <View style={styles.resultContent}>
              <View style={styles.resultLabel}>
                {isMine ? <Ionicons name="checkmark" size={14} color={colors.text} /> : null}
                <Text
                  style={[styles.optionText, { color: colors.text, fontWeight: isMine ? '700' : '400' }]}
                  numberOfLines={1}
                >
                  {option.text}
                </Text>
              </View>
              <Text style={[styles.percent, { color: colors.textSecondary }]}>{percent}%</Text>
            </View>
          </View>
        );
      })}

      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {messages.posts.poll.votes.replace('{count}', String(poll.totalVotes))} · {remaining()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.md,
    gap: Spacing.xs + 2,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  optionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  resultRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  resultLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  optionText: {
    fontSize: FontSize.sm,
    flexShrink: 1,
  },
  percent: {
    fontSize: FontSize.sm,
  },
  meta: {
    fontSize: FontSize.xs,
    paddingTop: 2,
  },
});
