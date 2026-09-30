import type { QueryClient } from '@tanstack/react-query';

/**
 * Ayni varligi farkli ekranlarda gosteren sorgularin ortak tazeleme listeleri.
 *
 * react-query ekran odagini bilmez (focusManager yalnizca AppState'e bagli):
 * stack'te geri donmek hicbir sorguyu tazelemez. Eskiden her mutasyon yalnizca
 * KENDI ekraninin anahtarini gecersizlestiriyordu; ornegin liste detayinda
 * takip edilen liste, Listeler sekmesinde eski takipci sayisiyla kaliyordu.
 * Onek ile gecersizlestirme gorunen sorguyu hemen, digerlerini ekran
 * acildiginda yeniden ceker.
 */

/**
 * Liste kartlari: takipci sayisi, takip durumu, puan ortalamasi, oyun sayisi.
 * Liste DETAYI bilerek disarida: cagiran ekran onu kendi id'siyle zaten tazeliyor
 * (AddGameToListModal o refetch'i bekleyerek butonu kilitliyor; onek ile ikinci
 * kez gecersizlestirmek o istegi iptal edip kilidi erken acardi).
 */
const LIST_KEYS = ['myLists', 'publicLists', 'followedLists', 'userLists'] as const;

export function invalidateListSummaries(queryClient: QueryClient) {
  for (const key of LIST_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/** Takip iliskisi: takipci/takip sayilari, "Takip ediliyor" durumu, takipci pencereleri. */
const FOLLOW_KEYS = ['myProfile', 'publicProfile', 'userStats', 'followers', 'following'] as const;

/**
 * @param includeSuggestions Ana sayfadaki "Taniyor olabilecegin kisiler" seridi de
 * tazelensin mi. Seridin kendisi takip edileni cache'ten zaten cikariyor; orada
 * false verilir ki serit kullanici dokunurken yeniden dizilmesin.
 */
export function invalidateFollowGraph(
  queryClient: QueryClient,
  { includeSuggestions = true }: { includeSuggestions?: boolean } = {},
) {
  for (const key of FOLLOW_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
  if (includeSuggestions) {
    void queryClient.invalidateQueries({ queryKey: ['suggestedUsers'] });
    void queryClient.invalidateQueries({ queryKey: ['suggestedAgents'] });
  }
}
