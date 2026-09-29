import { RegisterView } from "../_components/register-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

export const generateMetadata = staticPageMetadata("/register", "register");

export default function RegisterPage() {
    return <RegisterView />;
}
