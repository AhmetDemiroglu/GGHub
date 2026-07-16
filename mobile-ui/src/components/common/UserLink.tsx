import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/src/components/common/Avatar';
import { displayName } from '@/src/utils/display-name';

/**
 * Profil linki verilebilen bir kullanicinin asgari sekli. SocialProfile, UserDto,
 * ListOwner ve ReviewUser bu sekli yapisal olarak karsilar; bu yuzden cagri
 * yerlerinde donusturme (mapping) gerekmez.
 */
export interface LinkableUser {
  username: string;
  profileImageUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /**
   * Gizli profil, profil ekraninda 404 verir; o yuzden link ACILMAZ.
   * Alani tasimayan DTO'larda (or. ListOwner, ConversationDto) undefined gelir.
   * undefined = "bilgi yok" demektir ve bugunku davranis korunur (link acilir);
   * yalnizca acikca false ise kapatilir.
   */
  isProfileAccessible?: boolean;
}

/**
 * Profil navigasyonu icin TEK dogruluk kaynagi. Satirin tamaminin link oldugu
 * yerlerde (liderlik tablosu, takipci listesi, aktivite akisi) bilesen yerine
 * bu hook kullanilir; boylece route string'i ve gizlilik kapisi tek yerde kalir.
 */
export function useUserLink() {
  const router = useRouter();

  const canOpen = useCallback((user?: LinkableUser | null): boolean => {
    if (!user || !user.username) return false;
    return user.isProfileAccessible !== false;
  }, []);

  const openProfile = useCallback(
    (user?: LinkableUser | null) => {
      if (!user || !user.username) return;
      if (user.isProfileAccessible === false) return;
      router.push(`/profiles/${user.username}`);
    },
    [router],
  );

  /** Yalnizca kullanici adi elde olan yerler icin (or. @bahis metinleri). */
  const openProfileByUsername = useCallback(
    (username?: string | null) => {
      if (!username) return;
      router.push(`/profiles/${username}`);
    },
    [router],
  );

  return { canOpen, openProfile, openProfileByUsername };
}

interface UserLinkAvatarProps {
  user: LinkableUser;
  size?: number;
  /** Navigasyondan once calisir (or. acik bir modali kapatmak icin). */
  onBeforeNavigate?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar varyanti. Avatar bilesenini SARMALAR (degistirmez): Avatar bircok yerde
 * link'siz de kullaniliyor.
 */
export function UserLinkAvatar({
  user,
  size = 32,
  onBeforeNavigate,
  style,
}: UserLinkAvatarProps) {
  const { canOpen, openProfile } = useUserLink();
  const pressable = canOpen(user);

  const avatar = (
    <Avatar uri={user.profileImageUrl} name={displayName(user)} size={size} />
  );

  // Gizli profil: dokunma hedefi yok ama yerlesim AYNI kalmali. Bu yuzden
  // fragment degil, ayni style'i tasiyan bir View dondurulur; aksi halde
  // cagri yerinin verdigi style (or. flex:1) dusup satir bozulurdu.
  if (!pressable) {
    return <View style={style}>{avatar}</View>;
  }

  return (
    <Pressable
      style={style}
      hitSlop={6}
      onPress={() => {
        onBeforeNavigate?.();
        openProfile(user);
      }}
    >
      {avatar}
    </Pressable>
  );
}

interface UserLinkNameProps {
  user: LinkableUser;
  /**
   * 'name'     -> "Ad Soyad" (ad yoksa username)
   * 'handle'   -> "@username"
   * 'username' -> "username" (@ isareti olmadan)
   */
  variant?: 'name' | 'handle' | 'username';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onBeforeNavigate?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  /** Isim satirinin altinda gosterilecek ek icerik (or. zaman damgasi). */
  children?: React.ReactNode;
}

/**
 * Ad varyanti. Avatar ile KARDES iki Pressable olarak kullanilir ve ayni handler'i
 * paylasir (yerlesik desen: ReviewCard).
 */
export function UserLinkName({
  user,
  variant = 'name',
  style,
  numberOfLines,
  onBeforeNavigate,
  containerStyle,
  children,
}: UserLinkNameProps) {
  const { canOpen, openProfile } = useUserLink();
  const pressable = canOpen(user);
  const label =
    variant === 'handle'
      ? `@${user.username}`
      : variant === 'username'
        ? user.username
        : displayName(user);

  const content = (
    <>
      <Text style={style} numberOfLines={numberOfLines}>
        {label}
      </Text>
      {children}
    </>
  );

  // Gizli profilde de ayni kap korunur (bkz. UserLinkAvatar'daki aciklama).
  if (!pressable) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <Pressable
      style={containerStyle}
      hitSlop={6}
      onPress={() => {
        onBeforeNavigate?.();
        openProfile(user);
      }}
    >
      {content}
    </Pressable>
  );
}

interface UserLinkMentionProps {
  username: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Satir ici @bahis varyanti. <Text> icinde ic ice kullanilabilmesi icin Pressable
 * DEGIL, onPress alan bir <Text>'tir (RN'de Pressable, Text akisinin icine gomulemez).
 *
 * Burada gizlilik kapisi YOKTUR ve olmasi da gerekmez: istemci hangi handle'in
 * gercek oldugunu bilmez. Bu guvenli, cunku /profiles/{olmayan} ile
 * /profiles/{gizli} AYNI sekilde 404 verir; yani link'in acilmasi hicbir sey
 * sizdirmaz. Ayrica bahis metni backend'in dogruluk kaynagi degil, sadece
 * gorunumdur.
 */
export function UserLinkMention({ username, style }: UserLinkMentionProps) {
  const { openProfileByUsername } = useUserLink();

  return (
    <Text style={style} onPress={() => openProfileByUsername(username)} suppressHighlighting>
      @{username}
    </Text>
  );
}
