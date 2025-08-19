import type { Platform } from "@/models/gaming/game.model";
import PcIcon  from "./icons/pc-icon.svg";
import PlaystationIcon from "./icons/playstation-icon.svg";
import LinuxIcon  from "./icons/linux-icon.svg";
import XboxIcon from "./icons/xbox-icon.svg";
import AppleIcon  from "./icons/apple-icon.svg";
import NintendoIcon  from "./icons/nintendo-icon.svg";
import SegaIcon  from "./icons/sega-icon.svg";
import AtariIcon  from "./icons/atari-icon.svg";
import AndroidIcon  from "./icons/android-icon.svg";
import IosIcon  from "./icons/ios-icon.svg";
import WebIcon  from "./icons/web-icon.svg";


const iconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  pc: PcIcon,
  playstation: PlaystationIcon,
  xbox: XboxIcon,
  linux: LinuxIcon,
  mac: AppleIcon,
  macos: AppleIcon,
  macintosh: AppleIcon,
  nintendo: NintendoIcon,
  atari: AtariIcon,
  sega: SegaIcon,
  ios: IosIcon,
  android: AndroidIcon,
  web: WebIcon,
};

export const PlatformIcons = ({ platforms }: { platforms: Platform[] }) => {
  const uniqueIcons = new Set<React.FC<React.SVGProps<SVGSVGElement>>>();
  platforms.forEach(p => {
    const slug = p.slug.toLowerCase();
    for (const key in iconMap) {
      if (slug.includes(key)) {
        uniqueIcons.add(iconMap[key]);
        break; 
      }
    }
  });

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {Array.from(uniqueIcons).map((Icon, index) => (
        <Icon key={index} className="h-4 w-4" />
      ))}
    </div>
  );
};