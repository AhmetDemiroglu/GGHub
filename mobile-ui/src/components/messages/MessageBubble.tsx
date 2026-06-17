import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { Spacing, FontSize, BorderRadius, Shadows } from '@/src/constants/theme';

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
    <Animated.View
      entering={FadeInDown.springify().mass(0.6).stiffness(400).damping(20)}
      style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}
    >
      <Animated.View
        style={[
          styles.bubble,
          isMine
            ? [styles.bubbleMine, { backgroundColor: colors.primary }, Shadows.sm]
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
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.checkWrap}
            >
              <Ionicons
                name={isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={isRead ? '#a5f3fc' : 'rgba(255,255,255,0.7)'}
              />
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
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
  checkWrap: {
    marginLeft: 4,
  },
});
