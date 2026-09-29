import { BirthdayView } from "@/core/components/other/birthday/birthday-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/birthday", "birthday", { noIndex: true });

export default function BirthdayPage() {
    return <BirthdayView />;
}
