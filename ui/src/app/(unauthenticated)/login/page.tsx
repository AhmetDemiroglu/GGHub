import { LoginView } from "../_components/login-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/login", "login");

export default function LoginPage() {
    return <LoginView />;
}
