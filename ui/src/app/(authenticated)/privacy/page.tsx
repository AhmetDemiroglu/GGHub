import { PrivacyView } from "@/core/components/other/public/privacy-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/privacy", "privacy");

export default function PrivacyPage() {
    return <PrivacyView />;
}
