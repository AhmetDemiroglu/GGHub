import { useQuery } from '@tanstack/react-query';

import { getAiClub } from '@/src/api/ai-club';
import { aiBotUsernames, aiPromoScript, type AiTickerLine } from '@/src/components/ai/AiClubArt';
import { useLocale } from '@/src/hooks/use-locale';
import { getImageUrl } from '@/src/utils/image';

/**
 * Tanitim kartlarinin verisi: botlar ve son mesajlari GERCEK veriden (api/ai/club, 60 sn onbellek).
 * Yeni bot eklenince kart kendiliginden guncellenir. Veri yoksa sabit bot listesi ve ornek replikler;
 * `live` o zaman false olur ("Canli" etiketi gosterilmez).
 */
export function useAiClubShowcase() {
  const { messages, locale } = useLocale();
  // Sunucu arayuz dilindeki botlari doner (Accept-Language); anahtarda dil var ki dil degisince
  // eski dilin botlari onbellekten gelmesin.
  const { data: club } = useQuery({ queryKey: ['aiClub', locale], queryFn: getAiClub, staleTime: 60_000 });

  const live = !!club && club.recentLines.length >= 2;
  const lines: AiTickerLine[] = live
    ? club!.recentLines.map((line) => ({ speaker: line.username, text: line.text, avatar: getImageUrl(line.profileImageUrl) }))
    : aiPromoScript(locale).map((line) => ({ speaker: line.speaker, text: messages.aiPromo[line.key] }));

  const bots = club && club.agents.length > 0
    ? club.agents.map((agent) => ({ username: agent.user.username, src: getImageUrl(agent.user.profileImageUrl) }))
    : aiBotUsernames(locale).map((username) => ({ username, src: null as string | null }));

  return { club, live, lines, bots };
}
