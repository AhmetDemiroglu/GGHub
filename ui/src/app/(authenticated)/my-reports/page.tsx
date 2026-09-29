import { MyReportsView } from "@/core/components/other/reports/my-reports-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/my-reports", "myReports", { noIndex: true });

export default function MyReportsPage() {
    return <MyReportsView />;
}
