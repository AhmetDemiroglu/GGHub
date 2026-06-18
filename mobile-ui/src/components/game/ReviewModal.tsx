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
import { useToast } from '@/src/components/common/Toast';
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
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setContent(existingReview.content);
    } else {
      setRating(0);
      setContent('');
    }
  }, [existingReview, visible]);

  const createMutation = useMutation({
    mutationFn: () => createReview({ gameId, rating, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameReviews', gameId] });
      queryClient.invalidateQueries({ queryKey: ['myReview', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameSlug] });
      showToast('success', messages.games.reviewSaved, `${rating}/10`);
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateReview(existingReview!.id, { rating, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameReviews', gameId] });
      queryClient.invalidateQueries({ queryKey: ['myReview', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', gameSlug] });
      showToast('success', messages.games.reviewUpdated, `${rating}/10`);
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
          {messages.games.ratingLabel} {rating > 0 ? `(${rating}/10)` : ''}
        </Text>
        <View style={styles.ratingGrid}>
          {Array.from({ length: 10 }, (_, index) => {
            const value = index + 1;
            const selected = value === rating;
            const filled = rating > 0 && value <= rating;
            const isLow = value <= 4;
            const isMid = value === 5;
            const activeColor = isLow ? colors.error : isMid ? colors.warning : colors.success;

            return (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={[
                  styles.ratingButton,
                  {
                    borderColor: filled ? activeColor : colors.border,
                    backgroundColor: filled ? activeColor : colors.surface,
                  },
                  selected ? styles.ratingButtonSelected : null,
                ]}
              >
                <Text
                  style={[
                    styles.ratingButtonText,
                    { color: filled ? '#ffffff' : colors.textMuted },
                    filled && isMid ? styles.ratingButtonTextDark : null,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.ratingGuide}>
          <Text style={[styles.ratingGuideText, { color: colors.textMuted }]}>
            {messages.games.ratingWeak}
          </Text>
          <View style={[styles.ratingGuideLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.ratingGuideText, { color: colors.textMuted }]}>
            {messages.games.ratingAverage}
          </Text>
          <View style={[styles.ratingGuideLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.ratingGuideText, { color: colors.textMuted }]}>
            {messages.games.ratingLegendary}
          </Text>
        </View>
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
    textTransform: 'uppercase',
  },
  ratingGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ratingButton: {
    width: 44,
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingButtonSelected: {
    transform: [{ scale: 1.04 }],
  },
  ratingButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  ratingButtonTextDark: {
    color: '#111111',
  },
  ratingGuide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  ratingGuideText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  ratingGuideLine: {
    height: 1,
    flex: 1,
    maxWidth: 80,
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
