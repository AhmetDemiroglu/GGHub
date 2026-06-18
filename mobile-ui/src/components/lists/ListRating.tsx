import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useRequireAuth } from '@/src/contexts/auth-prompt-context';
import { useToast } from '@/src/components/common/Toast';
import { submitListRating, getMyListRating } from '@/src/api/list-rating';
import { Spacing, FontSize } from '@/src/constants/theme';

interface ListRatingProps {
  listId: number;
  averageRating: number;
  ratingCount: number;
}

export function ListRating({ listId, averageRating, ratingCount }: ListRatingProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const requireAuth = useRequireAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const { data: myRatingData } = useQuery({
    queryKey: ['myListRating', listId],
    queryFn: () => getMyListRating(listId),
    enabled: isAuthenticated,
  });

  const myRating = myRatingData?.value ?? 0;
  const displayedRating = selectedRating ?? myRating;

  const ratingMutation = useMutation({
    mutationFn: (value: number) => submitListRating(listId, { value }),
    onSuccess: (_, value) => {
      queryClient.invalidateQueries({ queryKey: ['myListRating', listId] });
      queryClient.invalidateQueries({ queryKey: ['listDetail', listId] });
      showToast('success', messages.listDetail.ratingSaved.replace('{rating}', String(value)));
    },
    onError: () => {
      setSelectedRating(null);
      showToast('error', messages.listDetail.ratingSaveError);
    },
  });

  const handleRate = (value: number) => {
    requireAuth(() => {
      setSelectedRating(value);
      ratingMutation.mutate(value);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.averageContainer}>
        <Ionicons name="star" size={20} color={colors.star} />
        <Text style={[styles.averageText, { color: colors.text }]}>
          {averageRating > 0 ? averageRating.toFixed(1) : '-'}
        </Text>
        <Text style={[styles.countText, { color: colors.textMuted }]}>
          ({ratingCount})
        </Text>
      </View>

      {isAuthenticated ? (
        <View style={styles.userRatingContainer}>
          <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
            {displayedRating > 0 ? messages.listDetail.yourRating : messages.listDetail.rateThis}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => handleRate(star)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= displayedRating ? 'star' : 'star-outline'}
                  size={28}
                  color={colors.star}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  averageText: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  countText: {
    fontSize: FontSize.sm,
  },
  userRatingContainer: {
    marginTop: Spacing.sm,
  },
  ratingLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  starButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
