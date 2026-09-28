import React, { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { BorderRadius, FontSize, Spacing } from '@/src/constants/theme';
import type { AppReleaseCheck } from '@/src/models/app-release';
import { DinoRunner, type DinoRunnerHandle } from './DinoRunner';

interface BlockedScreenProps {
  result: AppReleaseCheck;
  /** Bakim modunda "tekrar dene": sunucuya yeniden sorar. */
  onRetry: () => Promise<void>;
}

/**
 * Uygulamanin yerine gecen tam ekran kapi: bakim modu ya da zorunlu guncelleme. Navigator mount
 * edilmez; kullanici yalnizca magazaya gidebilir veya (bakimda) yeniden deneyebilir. Beklerken
 * T-Rex oyunu var.
 */
export function BlockedScreen({ result, onRetry }: BlockedScreenProps) {
  const { colors, isDark } = useTheme();
  const { locale, messages } = useLocale();
  const m = messages.appRelease;
  const [retrying, setRetrying] = useState(false);
  const game = useRef<DinoRunnerHandle>(null);

  const isMaintenance = result.status === 'maintenance';
  const customMessage = locale === 'tr' ? result.maintenanceMessageTr : result.maintenanceMessageEn;
  const title = isMaintenance ? m.maintenanceTitle : m.requiredTitle;
  const body = isMaintenance
    ? customMessage || m.maintenanceBody
    : m.requiredBody.replace('{version}', result.minVersion ?? '');

  const openStore = async () => {
    try {
      await Linking.openURL(result.storeUrl);
    } catch {
      // Magaza acilamadi (ornek: simulator). Sessiz gec, kullanici tekrar deneyebilir.
    }
  };

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Bos alanin tamami oyun kumandasi: oyun alani kucuk, basparmak nereye dokunursa ziplasin.
          Butonlar kendi Pressable'lari oldugu icin dokunusu kendileri alir, oyuna gitmez. */}
      <Pressable style={styles.content} onPress={() => game.current?.tap()}>
        <LinearGradient
          colors={isMaintenance ? ['#f59e0b', '#ef4444'] : ['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <Ionicons name={isMaintenance ? 'construct' : 'cloud-download'} size={34} color="#ffffff" />
        </LinearGradient>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

        <View style={styles.game}>
          <DinoRunner ref={game} />
        </View>

        <View style={styles.actions}>
          {isMaintenance ? (
            <Pressable
              onPress={retry}
              disabled={retrying}
              accessibilityRole="button"
              style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary, opacity: pressed || retrying ? 0.7 : 1 }]}
            >
              <Ionicons name="refresh" size={18} color="#ffffff" />
              <Text style={styles.btnText}>{retrying ? m.checking : m.retry}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={openStore}
              accessibilityRole="button"
              style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name={result.platform === 'ios' ? 'logo-apple' : 'logo-google-playstore'} size={18} color="#ffffff" />
              <Text style={styles.btnText}>{result.platform === 'ios' ? m.openAppStore : m.openGooglePlay}</Text>
            </Pressable>
          )}
          <Text style={[styles.version, { color: colors.textMuted }]}>
            {m.currentVersion.replace('{version}', result.currentVersion)}
          </Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 360,
  },
  game: {
    width: '100%',
    maxWidth: 420,
    marginTop: Spacing.xxl,
  },
  actions: {
    width: '100%',
    maxWidth: 420,
    marginTop: 'auto',
    paddingTop: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  btn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  btnText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  version: {
    fontSize: FontSize.xs,
  },
});
