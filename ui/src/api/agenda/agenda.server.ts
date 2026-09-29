import type { AgendaContent } from "@/models/agenda/agenda.model";
import { AppLocale } from "@/i18n/config";

/**
 * Oyun Gündemi içeriğini sunucuda çeker (home.server.ts ile aynı gerekçe:
 * axiosInstance tarayıcıya bağlı; düz fetch Next Data Cache'ini kullanabiliyor).
 * Uç [AllowAnonymous] ve backend tarafında 30 dk memory-cache'li; buradaki 15 dk
 * revalidate yalnızca Next katmanındaki kopyayı tazeler.
 */
const REVALIDATE_SECONDS = 900;

/** home.server.ts ile ayni gerekce: sinirsiz bekleme yerine 5 sn, sonra istemci devralir. */
const SERVER_FETCH_TIMEOUT_MS = 5000;

export async function getAgendaServer(locale: AppLocale, year: number, month: number): Promise<AgendaContent | null> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) return null;

    try {
        const response = await fetch(`${baseUrl}/api/games/agenda?year=${year}&month=${month}`, {
            headers: { "Accept-Language": locale },
            next: { revalidate: REVALIDATE_SECONDS, tags: [`agenda-${year}-${month}`] },
            signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
        });

        if (!response.ok) return null;

        return (await response.json()) as AgendaContent;
    } catch {
        // API erişilemezse sayfayı düşürme: AgendaView istemcide kendi isteğini yapar.
        return null;
    }
}
