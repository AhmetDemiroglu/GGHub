import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface MessageBubbleProps {
  content: string;
  sentAt: string;
  isMine: boolean;
  isRead: boolean;
}

export function MessageBubble({ content, sentAt, isMine, isRead }: MessageBubbleProps) {
  const { colors } = useTheme();

  const time = new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View
        style={[
          styles.bubble,
          isMine
            ? [styles.bubbleMine, { backgroundColor: colors.primary }]
            : [styles.bubbleTheirs, { backgroundColor: colors.surface, borderColor: colors.border }],
        ]}
      >
        <Text
          style={[
            styles.content,
            { color: isMine ? '#ffffff' : colors.text },
          ]}
        >
          {content}
        </Text>
        <View style={styles.meta}>
          <Text
            style={[
              styles.time,
              { color: isMine ? 'rgba(255,255,255,0.7)' : colors.textMuted },
            ]}
          >
            {time}
          </Text>
          {isMine ? (
            <Ionicons
              name={isRead ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={isRead ? '#a5f3fc' : 'rgba(255,255,255,0.7)'}
              style={styles.checkIcon}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.md,
    marginVertical: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  content: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: {
    fontSize: FontSize.xs,
  },
  checkIcon: {
    marginLeft: 4,
  },
});
