/**
 * Token yenileme hatasi "gercek kimlik reddi" mi (refresh token gecersiz, suresi dolmus,
 * iptal edilmis) yoksa "gecici" mi (ag yok, timeout, 429, 5xx)?
 *
 * YALNIZCA gercek redde cikis yapilir. Mobil istemci (mobile-ui/src/api/client.ts,
 * isAuthRejection) bu kurali bastan beri uyguluyordu; web her hatada cikis yapiyordu, yani
 * API'nin yavas ya da erisilemez oldugu anlarda kullanici gecerli bir oturumla bile disari
 * atiliyordu. Iki istemci ayni kurali paylassin diye burada tek yerde.
 */
export function isAuthRejectionStatus(status: number | undefined): boolean {
    return status === 400 || status === 401 || status === 403;
}
