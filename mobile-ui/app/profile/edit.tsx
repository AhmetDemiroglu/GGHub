import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { LoadingScreen } from '@/src/components/common/LoadingScreen';
import { Input } from '@/src/components/common/Input';
import { Button } from '@/src/components/common/Button';
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { getMyProfile, updateMyProfile } from '@/src/api/profile';
import type { ProfileForUpdate } from '@/src/models/profile';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';

export default function ProfileEditScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { messages } = useLocale();
  const queryClient = useQueryClient();
  const ef = messages.profile.editForm;

  const profileQuery = useQuery({
    queryKey: ['myProfile'],
    queryFn: getMyProfile,
  });

  const profile = profileQuery.data;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showDob, setShowDob] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setBio(profile.bio ?? '');
      setStatus(profile.status ?? '');
      setShowEmail(profile.isEmailPublic);
      setShowPhone(profile.isPhoneNumberPublic);
      setShowDob(profile.isDateOfBirthPublic);
      setProfileImageUrl(profile.profileImageUrl);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForUpdate) => updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      Alert.alert('', ef.success);
      router.back();
    },
    onError: () => {
      Alert.alert('', messages.common.genericError);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      firstName: firstName || null,
      lastName: lastName || null,
      bio: bio || null,
      isEmailPublic: showEmail,
      isPhoneNumberPublic: showPhone,
      isDateOfBirthPublic: showDob,
      profileImageUrl,
    });
  };

  const handlePhotoUploaded = (newUrl: string) => {
    setProfileImageUrl(newUrl);
  };

  if (profileQuery.isLoading) return <LoadingScreen />;

  return (
    <ScreenWrapper>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{ef.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.photoSection}>
          <ProfilePhotoUploader
            currentUri={profileImageUrl}
            name={firstName || profile?.username}
            onUploaded={handlePhotoUploaded}
          />
          <Text style={[styles.photoLabel, { color: colors.primary }]}>{ef.save}</Text>
        </View>

        <Input
          label={ef.firstName}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={ef.firstName}
        />

        <Input
          label={ef.lastName}
          value={lastName}
          onChangeText={setLastName}
          placeholder={ef.lastName}
        />

        <Input
          label={ef.bio}
          value={bio}
          onChangeText={setBio}
          placeholder={ef.bio}
          multiline
          numberOfLines={3}
          style={styles.bioInput}
        />

        <Input
          label={ef.status}
          value={status}
          onChangeText={setStatus}
          placeholder={ef.status}
        />

        <View style={styles.toggleSection}>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>{ef.showEmail}</Text>
            <Switch
              value={showEmail}
              onValueChange={setShowEmail}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
            />
          </View>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>{ef.showPhoneNumber}</Text>
            <Switch
              value={showPhone}
              onValueChange={setShowPhone}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
            />
          </View>
          <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>{ef.showDateOfBirth}</Text>
            <Switch
              value={showDob}
              onValueChange={setShowDob}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
            />
          </View>
        </View>

        <Button
          title={updateMutation.isPending ? ef.saving : ef.save}
          onPress={handleSave}
          loading={updateMutation.isPending}
          fullWidth
          style={styles.saveBtn}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  photoLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: {
    fontSize: FontSize.md,
    flex: 1,
  },
  saveBtn: {
    marginTop: Spacing.md,
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
});
