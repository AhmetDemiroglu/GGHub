import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
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
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [hoverStar, setHoverStar] = useState(0);

  const { data: myRatingData } = useQuery({
    queryKey: ['myListRating', listId],
    queryFn: () => getMyListRating(listId),
    enabled: isAuthenticated,
  });

  const myRating = myRatingData?.value ?? 0;

  const ratingMutation = useMutation({
    mutationFn: (value: number) => submitListRating(listId, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myListRating', listId] });
      queryClient.invalidateQueries({ queryKey: ['listDetail', listId] });
      showToast('success', messages.listDetail.ratingSaved);
    },
    onError: () => {
      showToast('error', messages.listDetail.ratingSaveError);
    },
  });

  const handleRate = (value: number) => {
    if (!isAuthenticated) {
      showToast('info', messages.listDetail.loginRequiredAction);
      return;
    }
    ratingMutation.mutate(value);
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
            {myRating > 0 ? messages.listDetail.yourRating : messages.listDetail.rateThis}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => handleRate(star)}
                onPressIn={() => setHoverStar(star)}
                onPressOut={() => setHoverStar(0)}
                hitSlop={4}
              >
                <Ionicons
                  name={star <= (hoverStar || myRating) ? 'star' : 'star-outline'}
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
    gap: Spacing.xs,
  },
});
