import { MarketingView } from "@/core/components/other/public/marketing-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/marketing", "marketing");

export default function MarketingPage() {
    return <MarketingView />;
}
