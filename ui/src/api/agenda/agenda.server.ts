import type { AgendaContent } from "@/models/agenda/agenda.model";
import { AppLocale } from "@/i18n/config";
import { serverGet } from "@/api/server-fetch";

/**
 * Oyun Gundemi icerigini sunucuda ceker (ortak gerekce: api/server-fetch.ts).
 * Uc [AllowAnonymous] ve backend tarafinda 30 dk memory-cache'li; buradaki 15 dk
 * revalidate yalnizca Next katmanindaki kopyayi tazeler.
 */
const REVALIDATE_SECONDS = 900;

export async function getAgendaServer(locale: AppLocale, year: number, month: number): Promise<AgendaContent | null> {
    const { data } = await serverGet<AgendaContent>(`/api/games/agenda?year=${year}&month=${month}`, {
        locale,
        revalidate: REVALIDATE_SECONDS,
        tags: [`agenda-${year}-${month}`],
    });
    // API erisilemezse sayfayi dusurme: AgendaView istemcide kendi istegini yapar.
    return data;
}
