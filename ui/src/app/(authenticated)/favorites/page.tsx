import { FavoritesView } from "@/core/components/other/lists/favorites-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/favorites", "favorites", { noIndex: true });

export default function FavoritesPage() {
    return <FavoritesView />;
}
