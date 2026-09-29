import { MyListsView } from "@/core/components/other/lists/my-lists-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/my-lists", "myLists", { noIndex: true });

export default function MyListsPage() {
    return <MyListsView />;
}
