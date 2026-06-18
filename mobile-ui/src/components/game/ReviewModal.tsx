import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { FontSize, Spacing, BorderRadius } from '@/src/constants/theme';
import { StarRating } from '@/src/components/common/StarRating';
import { createReview, updateReview } from '@/src/api/review';
import type { Review } from '@/src/models/review';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: number;
  gameSlug: string;
  existingReview?: Review | null;
}

export function ReviewModal({ visible, onClose, gameId, gameSlug, existingReview }: ReviewModalProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (existingReview) {
      setRating(Math.round(existingReview.rating / 2));
      setContent(existingReview.content);
    } else {
      setRating(0);
      setContent('');
    }
  }, [existingReview, visible]);

  const createMutation = useMutation({
    mutationFn: () => createReview({ gameId, rating: rating * 2, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameReviews', gameId] });
      queryClient.invalidateQueries({ queryKey: ['myReview', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameSlug] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateReview(existingReview!.id, { rating: rating * 2, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameReviews', gameId] });
      queryClient.invalidateQueries({ queryKey: ['myReview', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameSlug] });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!existingReview;

  const handleSubmit = () => {
    if (rating === 0) return;
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? messages.games.editReview : messages.games.writeReview}
    >
      <View style={styles.ratingSection}>
        <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
          {messages.games.ratingLabel}
        </Text>
        <StarRating rating={rating} maxStars={5} size={32} interactive onRatingChange={setRating} />
        {rating > 0 ? (
          <Text style={[styles.ratingValue, { color: colors.primary }]}>{rating * 2}/10</Text>
        ) : null}
      </View>

      <TextInput
        style={[
          styles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          },
        ]}
        placeholder={messages.games.reviewPlaceholder}
        placeholderTextColor={colors.placeholder}
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        maxLength={2000}
      />

      <View style={styles.charCount}>
        <Text style={[styles.charCountText, { color: colors.textMuted }]}>
          {content.length}/2000
        </Text>
      </View>

      {createMutation.isError || updateMutation.isError ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {messages.common.genericError}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.submitButton,
          { backgroundColor: rating > 0 ? colors.primary : colors.textMuted },
        ]}
        onPress={handleSubmit}
        disabled={rating === 0 || isPending}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitText}>{messages.common.submit}</Text>
        )}
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  ratingSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  ratingLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  ratingValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 120,
    marginBottom: Spacing.sm,
  },
  charCount: {
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  charCountText: {
    fontSize: FontSize.xs,
  },
  errorText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  submitButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
