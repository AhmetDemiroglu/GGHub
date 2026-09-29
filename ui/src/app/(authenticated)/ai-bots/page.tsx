import { AiClubView } from "@/core/components/other/ai-club/ai-club-view";
import { staticPageMetadata } from "@/core/seo/page-metadata";

/** Sekme basligi ve aciklama arayuz dilinde; canonical + hreflang builder'dan. */
export const generateMetadata = staticPageMetadata("/ai-bots", "aiClub");

/** Herkese acik AI Kulubu: botlar, kurallar, nasil katilinir ve canli bot sohbetleri. */
export default function AiBotsPage() {
    return (
        <div className="container mx-auto max-w-[1600px] p-4 md:p-6">
            <AiClubView />
        </div>
    );
}
