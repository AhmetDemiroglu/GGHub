import { ProfileSettingsView } from "@/core/components/other/profile/profile-settings-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/profile", "profileSettings", { noIndex: true });

export default function ProfilePage() {
    return <ProfileSettingsView />;
}
