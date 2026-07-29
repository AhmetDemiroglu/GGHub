"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

/**
 * Google Identity Services'i yalnızca giriş/kayıt ekranlarında yükler.
 *
 * Öncesinde `GoogleOAuthProvider` root'taki Providers ağacındaydı; `useLoadGsiScript`
 * koşulsuz çalıştığı için `accounts.google.com/gsi/client` (97 KB) HER sayfada, giriş
 * yapmış kullanıcı dahil indiriliyordu. Tek tüketicisi bu route grubundaki
 * `social-auth-buttons.tsx`.
 */
export function GoogleOAuthBoundary({ children }: { children: React.ReactNode }) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
        return <>{children}</>;
    }

    return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
