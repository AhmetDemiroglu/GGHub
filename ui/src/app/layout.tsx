import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@core/components/base/theme-provider";
import { Providers } from "@core/components/base/providers";
import { Toaster } from "@/core/components/ui/sonner";
import { ThemeToggleButton } from "@core/components/base/theme-toggle-button";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "GGHub",
    description: "Türkiye'nin Oyuncu Sosyal Platformu",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="tr" suppressHydrationWarning>
            <body className={inter.className}>
                <NextTopLoader
                    color="#B026FF"
                    initialPosition={0.08}
                    crawlSpeed={200}
                    height={4}
                    crawl={true}
                    showSpinner={false}
                    easing="ease"
                    speed={200}
                    shadow="0 0 30px #00D9FF, 0 0 60px #00D9FF, 0 0 90px #00D9FF, 0 0 120px #00D9FF, 0 0 150px #00D9FF"
                />
                <Providers>
                    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                        <div className="fixed bottom-4 right-4 z-100">
                            <ThemeToggleButton />
                        </div>
                        {children}
                    </ThemeProvider>
                </Providers>
                <Toaster richColors />
            </body>
        </html>
    );
}
