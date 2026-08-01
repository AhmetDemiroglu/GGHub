import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
// RN'inki degil: Android'de no-op. Bkz. common/BottomSheet import notu.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';

import { AuthRequiredView } from '@/src/components/common/AuthRequiredView';
import { ScreenWrapper } from '@/src/components/common/ScreenWrapper';
import { PostComposer } from '@/src/components/posts/PostComposer';
import { ScreenHeader } from '@/src/components/shell';
import { Spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/use-auth';
import { useLocale } from '@/src/hooks/use-locale';

/**
 * Gonderi olusturma ekrani. (tabs) icinde DEGIL root Stack'te: X mimarisinde
 * tabs yalnizca 5 kok sekmeyi barindirir, geri kalan her ekran stack'te yasar
 * ve boylece kayarak acilip iOS'ta native geri jestini alir.
 */
export default function NewPostScreen() {
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // ScreenHeader ust guvenli alani kendisi uyguluyor; ScreenWrapper de sarinca
  // bosluk iki kez binip basligi asagi itiyordu (bkz. posts/[postId]).
  return (
    <ScreenWrapper noPadding safeArea={false}>
      <ScreenHeader title={messages.posts.newTitle} onBack={() => router.back()} />

      {!isAuthenticated ? (
        <AuthRequiredView />
      ) : (
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <PostComposer
              autoFocus
              onCreated={(post) => {
                // Olusturduktan sonra detayina git: kullanici ne paylastigini
                // gorur ve yanitlari takip edebilir (X davranisi).
                router.replace(`/posts/${post.id}` as never);
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxxl,
  },
});
