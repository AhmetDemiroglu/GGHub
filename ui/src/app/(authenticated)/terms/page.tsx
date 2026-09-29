import { TermsView } from "@/core/components/other/public/terms-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/terms", "terms");

export default function TermsPage() {
    return <TermsView />;
}
