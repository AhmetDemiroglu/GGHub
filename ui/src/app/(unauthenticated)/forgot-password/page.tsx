import { ForgotPasswordView } from "../_components/forgot-password-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/forgot-password", "forgotPassword", { noIndex: true });

export default function ForgotPasswordPage() {
    return <ForgotPasswordView />;
}
