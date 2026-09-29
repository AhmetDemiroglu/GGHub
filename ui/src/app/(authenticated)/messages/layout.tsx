import { MessagesShell } from "@/core/components/other/messages/messages-shell";
import { staticPageMetadata } from "@/core/seo/page-metadata";

/** Mesajlar kisiye ozel: butun alt rotalar (liste, sohbet) noindex. Kabuk istemci bileseni. */
export const generateMetadata = staticPageMetadata("/messages", "messages", { noIndex: true });

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
    return <MessagesShell>{children}</MessagesShell>;
}
