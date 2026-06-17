import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/hooks/use-auth';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useToast } from '@/src/components/common/Toast';
import * as haptics from '@/src/utils/haptics';
import { googleLogin, appleLogin } from '@/src/api/oauth';
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  OAUTH_ENABLED,
} from '@/src/constants/config';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { localeUpper } from '@/src/utils/format';

export function SocialAuthButtons() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const { messages, locale } = useLocale();
  const { showToast } = useToast();
  const t = messages.auth;

  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
      });
    }
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handleError = (error: unknown) => {
    const axiosError = error as { response?: { data?: { message?: string } } };
    const message = axiosError?.response?.data?.message || t.loginDefaultError;
    haptics.error();
    showToast('error', t.loginErrorTitle, message);
  };

  const handleGoogle = async () => {
    try {
      setBusy(true);
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') return; // cancelled
      const idToken = result.data.idToken;
      if (!idToken) return;
      const response = await googleLogin(idToken);
      await login(response.data);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === 'SIGN_IN_CANCELLED' || code === '12501' || code === '-5') return;
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  const handleApple = async () => {
    try {
      setBusy(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return;
      const fullName = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : undefined;
      const response = await appleLogin({
        identityToken: credential.identityToken,
        fullName: fullName || undefined,
      });
      await login(response.data);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      handleError(error);
    } finally {
      setBusy(false);
    }
  };

  // Hidden until OAuth is configured (Google client IDs present) - keeps the UI clean pre-launch.
  if (!OAUTH_ENABLED) return null;

  const showGoogle = Boolean(GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID);
  const showApple = Platform.OS === 'ios' && appleAvailable;
  if (!showGoogle && !showApple) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{localeUpper(t.orDivider, locale)}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      {showGoogle ? (
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleGoogle}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-google" size={18} color={colors.text} />
          <Text style={[styles.googleText, { color: colors.text }]}>{t.continueWithGoogle}</Text>
        </TouchableOpacity>
      ) : null}

      {showApple ? (
        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleApple}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-apple" size={20} color={colors.text} />
          <Text style={[styles.googleText, { color: colors.text }]}>{t.continueWithApple}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: FontSize.sm,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  googleText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  appleBtn: {
    width: '100%',
    height: 48,
  },
});
