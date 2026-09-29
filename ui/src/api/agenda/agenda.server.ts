import type { AgendaContent } from "@/models/agenda/agenda.model";
import { AppLocale } from "@/i18n/config";
import { serverGet } from "@/api/server-fetch";

/**
 * Oyun Gundemi icerigini sunucuda ceker (ortak gerekce: api/server-fetch.ts).
 * Uc [AllowAnonymous] ve backend tarafinda 10 dk memory-cache'li. Buradaki kopya 5 dk:
 * 15 dk iken bot vitrini duzelttikten sonra sayfa eski vitrini ceyrek saat daha gosterdi.
 * Istemci zaten acilista tazesini ceker (agenda-view.tsx initialDataUpdatedAt).
 */
const REVALIDATE_SECONDS = 300;

export async function getAgendaServer(locale: AppLocale, year: number, month: number): Promise<AgendaContent | null> {
    const { data } = await serverGet<AgendaContent>(`/api/games/agenda?year=${year}&month=${month}`, {
        locale,
        revalidate: REVALIDATE_SECONDS,
        tags: [`agenda-${year}-${month}`],
    });
    // API erisilemezse sayfayi dusurme: AgendaView istemcide kendi istegini yapar.
    return data;
}
