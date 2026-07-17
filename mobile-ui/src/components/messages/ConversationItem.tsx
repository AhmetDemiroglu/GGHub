import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserLinkAvatar, UserLinkName } from '@/src/components/common/UserLink';
import { Badge } from '@/src/components/common/Badge';
import { useTheme } from '@/src/hooks/use-theme';
import * as haptics from '@/src/utils/haptics';
import type { ConversationDto } from '@/src/models/message';
import { Spacing, FontSize } from '@/src/constants/theme';

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

  const handlePress = () => {
    haptics.impactLight();
    onPress();
  };

  // ConversationDto artik karsi tarafi tam UserDto olarak tasiyor: gercek ad ve
  // isProfileAccessible buradan gelir. Ikincisi onemli, cunku gizli bir profilin
  // avatarini linklemek 404'e goturuyordu. Eski yanitlar icin duz alanlara duseriz.
  const partner = conversation.partner ?? {
    username: conversation.partnerUsername,
    profileImageUrl: conversation.partnerProfileImageUrl,
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }, hasUnread && { backgroundColor: `${colors.primary}08` }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Avatar ve ad kendi dokunma hedefleridir -> profil. Satirin geri kalani
          sohbete gider: RN'de en derindeki hedef responder'i kazanir. */}
      <View style={hasUnread && [styles.unreadAvatarRing, { borderColor: colors.primary }]}>
        <UserLinkAvatar user={partner} size={50} />
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <UserLinkName
            user={partner}
            variant="name"
            numberOfLines={1}
            containerStyle={styles.usernameWrap}
            style={[
              styles.username,
              { color: colors.text, fontWeight: hasUnread ? '700' : '600' },
            ]}
          />
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
  unreadAvatarRing: {
    borderRadius: 999,
    borderWidth: 2,
    padding: 2,
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
  usernameWrap: {
    // flex:1 DEGIL. topRow space-between oldugu icin flex:1, isim Pressable'ini
    // saat metnine kadar tum satira yayiyordu: kisa bir adin sagindaki bos alana
    // basmak da profile gidiyordu ve sohbete gitmek neredeyse imkansizdi.
    // Simdi hedef metnin kendisi kadar; satirin geri kalani distaki
    // TouchableOpacity'ye (sohbet detayi) kalir.
    flexShrink: 1,
  },
  username: {
    fontSize: FontSize.md,
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
