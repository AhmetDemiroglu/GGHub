import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { getImageUrl } from '@/src/utils/image';
import { BorderRadius, FontSize } from '@/src/constants/theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 32 }: AvatarProps) {
  const { colors } = useTheme();
  const imageUrl = getImageUrl(uri);
  const initials = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceHighlight,
        },
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text style={[styles.initials, { color: colors.textSecondary, fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '600',
  },
});
