import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useMutation } from '@tanstack/react-query';
import { Spacing, FontSize } from '@/src/constants/theme';
import { BottomSheet } from '@/src/components/common/BottomSheet';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { reportReview, reportUser, reportList, reportComment } from '@/src/api/report';

type EntityType = 'review' | 'user' | 'list' | 'comment';

interface ReportActionSheetProps {
  visible: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: number;
}

export function ReportActionSheet({ visible, onClose, entityType, entityId }: ReportActionSheetProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const m = messages.report;

  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const getTitle = () => {
    switch (entityType) {
      case 'review': return m.reportReview;
      case 'user': return m.reportUser;
      case 'list': return m.reportList;
      case 'comment': return m.reportComment;
    }
  };

  const submitMutation = useMutation({
    mutationFn: () => {
      const data = { reason };
      switch (entityType) {
        case 'review': return reportReview(entityId, data);
        case 'user': return reportUser(entityId, data);
        case 'list': return reportList(entityId, data);
        case 'comment': return reportComment(entityId, data);
      }
    },
    onSuccess: () => {
      Alert.alert('', m.reportSuccess);
      setReason('');
      setError('');
      onClose();
    },
    onError: () => {
      Alert.alert('', m.reportError);
    },
  });

  const handleSubmit = () => {
    if (reason.trim().length < 10) {
      setError(m.reasonMinLength);
      return;
    }
    setError('');
    submitMutation.mutate();
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={getTitle()}>
      <View style={styles.content}>
        <Input
          label={m.reasonLabel}
          placeholder={m.reasonPlaceholder}
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            if (error && text.trim().length >= 10) setError('');
          }}
          multiline
          numberOfLines={5}
          error={error}
          style={styles.textarea}
        />
        <Button
          title={submitMutation.isPending ? m.submitting : m.submitReport}
          onPress={handleSubmit}
          variant="danger"
          loading={submitMutation.isPending}
          disabled={reason.trim().length < 10}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
