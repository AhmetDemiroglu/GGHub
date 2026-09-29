import { DataDeletionView } from "@/core/components/other/public/data-deletion-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/data-deletion", "dataDeletion");

export default function DataDeletionPage() {
    return <DataDeletionView />;
}
