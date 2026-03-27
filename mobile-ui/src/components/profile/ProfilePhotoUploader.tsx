import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Avatar } from '@/src/components/common/Avatar';
import { useTheme } from '@/src/hooks/use-theme';
import { uploadProfilePhoto } from '@/src/api/photo';
import { Spacing, BorderRadius } from '@/src/constants/theme';

interface ProfilePhotoUploaderProps {
  currentUri?: string | null;
  name?: string;
  size?: number;
  onUploaded: (newUrl: string) => void;
}

export function ProfilePhotoUploader({
  currentUri,
  name,
  size = 100,
  onUploaded,
}: ProfilePhotoUploaderProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const response = await uploadProfilePhoto(asset.uri);
      onUploaded(response.profileImageUrl);
    } catch {
      // Upload failed
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handlePickImage} disabled={uploading} activeOpacity={0.7}>
      <View style={styles.container}>
        <Avatar uri={currentUri} name={name} size={size} />
        <View
          style={[
            styles.cameraOverlay,
            {
              backgroundColor: colors.overlay,
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons name="camera" size={24} color="#ffffff" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
});
