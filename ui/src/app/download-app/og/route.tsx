import { ImageResponse } from "next/og";

// Social-share card for /download-app. Language-aware via ?lang (tr|en, default en).
export const runtime = "edge";

const COPY = {
    tr: {
        kicker: "MOBİL UYGULAMA YAYINDA",
        title: "GGHub'ı indir",
        sub: "Oyunları keşfet, puanla, listele ve oyuncu topluluğuna katıl.",
    },
    en: {
        kicker: "THE APP IS LIVE",
        title: "Download GGHub",
        sub: "Discover games, rate what you play, build lists and join the community.",
    },
} as const;

const APPLE_PATH =
    "M318.7 268.7c-.2-36.71 16.41-64.39 49.81-84.78-18.69-26.78-46.97-41.51-84.27-44.38-35.42-2.79-74.18 20.62-88.39 20.62-15.02 0-49.31-19.62-76.27-19.62C63.4 141.51 4 184.81 4 272.83c0 26.01 4.76 52.88 14.28 80.59 12.71 36.41 58.56 125.81 106.39 124.36 25.02-.59 42.71-17.73 75.27-17.73 31.58 0 47.95 17.73 75.85 17.73 48.25-.7 89.74-81.95 101.83-118.46-64.78-30.51-61.21-89.46-61.21-90.21zm-56.65-164.24c27.32-32.42 24.83-61.93 24.02-72.59-24.13 1.4-52.06 16.42-67.97 34.9-17.52 19.82-27.83 44.32-25.61 71.45 26.07 2.01 49.81-11.42 69.56-33.76z";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const lang = (searchParams.get("lang") || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
    const c = COPY[lang];
    const shot = `${origin}/gghub-app-${lang}.jpg`;
    const logo = `${origin}/og/gghub-logo.png`;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "1200px",
                    height: "630px",
                    display: "flex",
                    position: "relative",
                    background: "#0a0b14",
                    overflow: "hidden",
                    fontFamily: "sans-serif",
                }}
            >
                {/* Brand glows */}
                <div
                    style={{
                        position: "absolute",
                        top: "-160px",
                        left: "-120px",
                        width: "520px",
                        height: "520px",
                        display: "flex",
                        background: "radial-gradient(circle, rgba(34,211,238,0.25), rgba(34,211,238,0) 70%)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "-200px",
                        right: "120px",
                        width: "660px",
                        height: "660px",
                        display: "flex",
                        background: "radial-gradient(circle, rgba(139,92,246,0.32), rgba(139,92,246,0) 70%)",
                    }}
                />

                {/* Left content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: "0 72px",
                        width: "740px",
                        height: "100%",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <img src={logo} width={66} height={66} alt="" />
                        <div style={{ display: "flex", marginLeft: "18px", fontSize: "44px", fontWeight: 800, color: "white" }}>GGHub</div>
                    </div>
                    <div style={{ display: "flex", marginTop: "38px", fontSize: "20px", letterSpacing: "5px", color: "#34d3ee", fontWeight: 700 }}>
                        {c.kicker}
                    </div>
                    <div style={{ display: "flex", marginTop: "12px", fontSize: "66px", fontWeight: 800, color: "white", lineHeight: 1.05 }}>
                        {c.title}
                    </div>
                    <div style={{ display: "flex", marginTop: "22px", fontSize: "27px", color: "rgba(255,255,255,0.72)", lineHeight: 1.4, maxWidth: "540px" }}>
                        {c.sub}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", marginTop: "42px" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                background: "black",
                                borderRadius: "16px",
                                padding: "14px 24px",
                                border: "1px solid rgba(255,255,255,0.18)",
                            }}
                        >
                            <svg width="26" height="26" viewBox="0 0 384 512">
                                <path fill="white" d={APPLE_PATH} />
                            </svg>
                            <div style={{ display: "flex", marginLeft: "12px", color: "white", fontSize: "24px", fontWeight: 700 }}>App Store</div>
                        </div>
                        <div style={{ display: "flex", marginLeft: "22px", color: "rgba(255,255,255,0.55)", fontSize: "22px" }}>gghub.social</div>
                    </div>
                </div>

                {/* Right: phone peeking from the bottom */}
                <div style={{ position: "absolute", right: "82px", top: "84px", display: "flex" }}>
                    <div
                        style={{
                            display: "flex",
                            padding: "9px",
                            background: "#18181b",
                            borderRadius: "48px",
                            border: "1px solid rgba(255,255,255,0.14)",
                            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
                        }}
                    >
                        <img src={shot} width={300} height={652} style={{ borderRadius: "40px" }} alt="" />
                    </div>
                </div>
            </div>
        ),
        { width: 1200, height: 630 },
    );
}
