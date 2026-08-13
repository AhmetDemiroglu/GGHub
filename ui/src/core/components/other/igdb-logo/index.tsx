import Image from "next/image";
import igdbLogoSrc from "@core/assets/igdb_logo.png";

/**
 * IGDB marka logosu (mor, şeffaf arka plan).
 *
 * DİKKAT: Bu logo ~2.08:1 oranında YATAY. RAWG/Metacritic/GGHub logoları kare olduğu için
 * onlarla aynı "w-3 h-3" kutusuna konulursa yüksekliği 1.4 piksele düşüyor ve okunmuyor.
 * Bu yüzden bileşen yalnızca YÜKSEKLİK alır (h-3 gibi), genişlik otomatik uzar.
 */
export function IgdbLogo({ className }: { className?: string }) {
    return (
        <Image
            src={igdbLogoSrc}
            alt="IGDB"
            width={50}
            height={24}
            className={`w-auto object-contain ${className ?? ""}`}
        />
    );
}
