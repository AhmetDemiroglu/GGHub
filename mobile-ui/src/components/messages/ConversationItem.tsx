import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '@/src/components/common/Avatar';
import { Badge } from '@/src/components/common/Badge';
import { useTheme } from '@/src/hooks/use-theme';
import type { ConversationDto } from '@/src/models/message';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

interface ConversationItemProps {
  conversation: ConversationDto;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { colors } = useTheme();
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Avatar
        uri={conversation.partnerProfileImageUrl}
        name={conversation.partnerUsername}
        size={50}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.username,
              { color: colors.text, fontWeight: hasUnread ? '700' : '600' },
            ]}
            numberOfLines={1}
          >
            {conversation.partnerUsername}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {formatTime(conversation.lastMessageSentAt)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.preview,
              { color: hasUnread ? colors.text : colors.textSecondary },
              hasUnread && styles.unreadText,
            ]}
            numberOfLines={1}
          >
            {conversation.lastMessage}
          </Text>
          {hasUnread ? <Badge count={conversation.unreadCount} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: FontSize.md,
    flex: 1,
  },
  time: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  preview: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
  },
});
