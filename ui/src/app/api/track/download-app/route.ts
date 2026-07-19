import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * /download-app telemetrisinin giris kapisi.
 *
 * Neden araya bu katman giriyor da tarayici dogrudan backend'e yazmiyor:
 *  1. Ayni origin oldugu icin CORS ve preflight sorunu yok (sendBeacon unload
 *     sirasinda preflight yapamaz).
 *  2. Backend GERCEK istemci IP'sini goremiyor. Railway proxy'si arkasinda
 *     RemoteIpAddress herkes icin ayni cikiyor (ForwardedHeaders yapilandirilmis
 *     degil, bkz. Program.cs). IP'yi goremeyen bir backend ne tekil ziyaretci
 *     sayabilir ne de kotuye kullanimi sinirlayabilir.
 *  3. Vercel ulke bilgisini bedavaya veriyor; "reklam dogru kitleye ulasiyor mu"
 *     sorusunun merkezinde cografya var.
 *
 * Ham IP backend'e HIC gonderilmez; burada gunluk donen tuzla hash'lenir.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4096;

/**
 * Gunluk donen tuz kilit gizlilik ozelligi: ayni kisi ertesi gun farkli hash
 * uretir, dolayisiyla hash uzerinden boylamsal profil cikarilamaz.
 * 16 byte = 128 bit; 10M degerde cakisma olasiligi ihmal edilebilir.
 */
function visitorHash(ip: string, userAgent: string): string {
    const salt = process.env.VISITOR_HASH_SALT ?? "gghub-dev-salt";
    const day = new Date().toISOString().slice(0, 10);
    return createHash("sha256").update(`${salt}|${day}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    if (!body || body.length > MAX_BODY_BYTES) {
        return new NextResponse(null, { status: 204 });
    }

    // Kaynak kontrolu: derinlemesine savunma. Spoof edilebilir ama tembel gurultuyu keser.
    const origin = request.headers.get("origin");
    if (origin && !/^https?:\/\/(localhost(:\d+)?|([\w-]+\.)?gghub\.social)$/.test(origin)) {
        return new NextResponse(null, { status: 204 });
    }

    const apiBaseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
        // Yapilandirma eksikse sessizce yut: olcum hatasi kullaniciyi etkilemesin.
        return new NextResponse(null, { status: 204 });
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
    const ip = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const country = request.headers.get("x-vercel-ip-country") ?? "";

    try {
        // await SART: Vercel yanittan sonra fonksiyonu dondurabilir, void fetch
        // sessizce olay kaybettirir.
        await fetch(`${apiBaseUrl}/api/download-analytics/collect`, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
                "X-Ingest-Key": process.env.DOWNLOAD_ANALYTICS_INGEST_KEY ?? "",
                "X-Visitor-Hash": visitorHash(ip, userAgent),
                "X-Visitor-Country": country,
                // Ham UA yalnizca siniflandirma icin gecer; backend kovalara
                // ayristirip ATAR, tam dizgeyi saklamaz.
                "X-Visitor-UA": userAgent,
            },
            body,
        });
    } catch {
        // Backend erisilemezse de kullaniciya hata donmez.
    }

    return new NextResponse(null, { status: 204 });
}
