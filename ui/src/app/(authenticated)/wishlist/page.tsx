import { WishlistView } from "@/core/components/other/lists/wishlist-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/wishlist", "wishlist", { noIndex: true });

export default function WishlistPage() {
    return <WishlistView />;
}
