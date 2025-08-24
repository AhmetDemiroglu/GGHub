import Image from "next/image";
import logoSrc from "@core/assets/logo.png";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 ml-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <Image 
              src={logoSrc} 
              alt="GGHub Logo" 
              width={35} 
              height={22} 
              priority
              className="h-8 w-auto"
            />
          </a>
        </div>
        {/* Buraya daha sonra menü ve kullanıcı profili gelecek */}
      </div>
    </header>
  );
}