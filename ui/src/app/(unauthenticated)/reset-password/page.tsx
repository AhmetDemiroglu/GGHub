import { ResetPasswordView } from "../_components/reset-password-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/reset-password", "resetPassword", { noIndex: true });

export default function ResetPasswordPage() {
    return <ResetPasswordView />;
}
