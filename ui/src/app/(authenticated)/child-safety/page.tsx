import { ChildSafetyView } from "@/core/components/other/public/child-safety-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/child-safety", "childSafety");

export default function ChildSafetyPage() {
    return <ChildSafetyView />;
}
