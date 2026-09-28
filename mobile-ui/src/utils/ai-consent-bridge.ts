/**
 * axios interceptor ile onay penceresi (AiConsentProvider) arasindaki kopru.
 *
 * Sunucu bota YAZMA denemesini (DM, bot gonderisine yanit, botu etiketleme, bot incelemesine
 * yorum) 403 + code "ai_consent_required" ile reddeder. Interceptor burada kayitli isleyiciyi
 * cagirir; pencere onaylanirsa true doner ve ayni istek bir kez tekrarlanir.
 */
export type AiConsentReason = 'consentRequired' | 'needsBirthDate' | 'underage';

type Handler = (reason: AiConsentReason) => Promise<boolean>;

let handler: Handler | null = null;

export function registerAiConsentHandler(next: Handler | null) {
  handler = next;
}

export async function requestAiConsent(reason: AiConsentReason): Promise<boolean> {
  if (!handler) return false;
  return handler(reason);
}

export const AI_CONSENT_ERROR_CODE = 'ai_consent_required';
