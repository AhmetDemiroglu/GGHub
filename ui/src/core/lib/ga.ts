export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}

export function pageview(path: string) {
    if (!GA_ID) return;
    window.gtag?.("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: path,
    });
}

export function gaEvent(name: string, params?: Record<string, any>) {
    if (!GA_ID) return;
    window.gtag?.("event", name, params);
}
