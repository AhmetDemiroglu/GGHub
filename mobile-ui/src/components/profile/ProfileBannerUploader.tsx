import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/hooks/use-theme';
import { uploadHeaderPhoto } from '@/src/api/photo';

interface ProfileBannerUploaderProps {
  onUploaded: (newUrl: string) => void;
}

/**
 * Floating "kamera" buton - banner üzerine konuştuğunda tıklanır,
 * ImagePicker açar, kullanıcı 3:1 oranında kırpıp seçer, sonra R2'ye
 * yüklenir ve `onUploaded` callback ile yeni URL bildirilir.
 */
export function ProfileBannerUploader({ onUploaded }: ProfileBannerUploaderProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const response = await uploadHeaderPhoto(result.assets[0].uri);
      onUploaded(response.headerImageUrl);
    } catch {
      // sessiz; toast veya alert call eden tarafta verilebilir
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePick}
      disabled={uploading}
      activeOpacity={0.7}
      style={styles.btn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {uploading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Ionicons name="camera" size={18} color="#ffffff" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
