import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Site geneli telemetrinin giris kapisi. /api/track/download-app ile ayni gerekcelerle var
 * (ayni origin, gercek IP'yi yalnizca burasi gorur, Vercel ulke bilgisi bedava). Tek fark:
 * tarayicinin Authorization basligi backend'e AYNEN iletilir; kullanici kimligini backend
 * JWT'den cozer, istemciden gelen hicbir kimlik alanina guvenilmez.
 *
 * Ortam degiskenleri download-app proxy'siyle ORTAK (VISITOR_HASH_SALT, DOWNLOAD_ANALYTICS_INGEST_KEY);
 * yeni bir Vercel/Railway ayari gerekmez.
 */

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4096;

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

    const origin = request.headers.get("origin");
    if (origin && !/^https?:\/\/(localhost(:\d+)?|([\w-]+\.)?gghub\.social)$/.test(origin)) {
        return new NextResponse(null, { status: 204 });
    }

    const apiBaseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
        return new NextResponse(null, { status: 204 });
    }

    const userAgent = request.headers.get("user-agent") ?? "";
    const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
    const ip = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const country = request.headers.get("x-vercel-ip-country") ?? "";
    const authorization = request.headers.get("authorization");

    const headers: Record<string, string> = {
        "Content-Type": "text/plain;charset=UTF-8",
        "X-Ingest-Key": process.env.DOWNLOAD_ANALYTICS_INGEST_KEY ?? "",
        "X-Visitor-Hash": visitorHash(ip, userAgent),
        "X-Visitor-Country": country,
        "X-Visitor-UA": userAgent,
    };
    if (authorization) headers.Authorization = authorization;

    try {
        await fetch(`${apiBaseUrl}/api/site-analytics/collect`, { method: "POST", headers, body });
    } catch {
        // Backend erisilemezse de kullaniciya hata donmez.
    }

    return new NextResponse(null, { status: 204 });
}
