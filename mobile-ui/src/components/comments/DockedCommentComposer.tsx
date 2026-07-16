import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { CommentComposer } from './CommentComposer';
import { useToast } from '@/src/components/common/Toast';
import { fillErrorTemplate } from '@/src/utils/format';
import { Spacing, FontSize } from '@/src/constants/theme';

export interface DockedCommentComposerProps {
  /** Yeni bir KOK yorum olusturan uc (yanitlar CommentThreadItem'da kalir). */
  create: (content: string) => Promise<unknown>;
  /** Gonderim basarili olunca tazelenecek yorum listesi sorgusu. */
  queryKey: readonly unknown[];
  /** Gonderim basarili olunca cagrilir; ekran listeye kaydirmak icin kullanir. */
  onPosted?: () => void;
}

/**
 * Ekranin altina sabitlenen kok yorum kutusu. Kayan icerigin ICINDE degil,
 * onun ALTINDA bir kardes olarak cizilir: klavye acilinca kutu klavyenin tam
 * ustune oturur (bkz. useKeyboardDock), tipki X ve Instagram'daki gibi.
 *
 * Yorum listesi ile arasindaki tek bag `queryKey`: gonderim sonrasi ayni sorgu
 * gecersizlestirilir ve liste (CommentSection / ReviewCommentSection) tazelenir.
 *
 * Giris yapmamis kullaniciya kutunun yerinde giris bagi gosterilir; boylece
 * bar her iki durumda da ayni yerde durur.
 */
export function DockedCommentComposer({ create, queryKey, onPosted }: DockedCommentComposerProps) {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [commentText, setCommentText] = useState('');
  const t = messages.commentsSection;

  const createMutation = useMutation({
    mutationFn: (content: string) => create(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCommentText('');
      showToast('success', t.added);
      // Sunucu kokleri yeniden eskiye siralar, yani yeni yorum listenin BASINA
      // dusar. Kutu altta sabit oldugu icin ekran listeye kaymazsa kullanici
      // yorumunun gittigini goremez.
      onPosted?.();
    },
    onError: () => {
      showToast('error', fillErrorTemplate(t.addError));
    },
  });

  const handleSend = () => {
    if (!commentText.trim() || createMutation.isPending) return;
    createMutation.mutate(commentText.trim());
  };

  return (
    <View
      style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }]}
    >
      {isAuthenticated ? (
        <CommentComposer
          value={commentText}
          onChangeText={setCommentText}
          placeholder={t.placeholder}
          onSend={handleSend}
          isSending={createMutation.isPending}
        />
      ) : (
        <View style={styles.loginRow}>
          <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>{t.loginPrompt}</Text>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel={t.loginLink}
          >
            <Text style={[styles.loginLink, { color: colors.primary }]}>{t.loginLink}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    // Kutu opak bir zemin ve ince bir ust cizgiyle kayan icerikten ayrilir.
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  loginPrompt: {
    fontSize: FontSize.sm,
  },
  loginLink: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
