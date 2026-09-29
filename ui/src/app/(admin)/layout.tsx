import type { ReactNode } from "react";
import { AdminShell } from "@/core/components/admin/admin-shell";
import { staticPageMetadata } from "@/core/seo/page-metadata";

/** Yonetim paneli: kok yollarda (/dashboard, /users...) yasar, hicbiri dizine girmez. Kabuk istemci bileseni. */
export const generateMetadata = staticPageMetadata("/dashboard", "admin", { noIndex: true });

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <AdminShell>{children}</AdminShell>;
}
