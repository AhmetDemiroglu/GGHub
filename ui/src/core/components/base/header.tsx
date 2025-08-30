import Image from "next/image";
import logoSrc from "@core/assets/logo.png";
import Link from "next/link";
import { useAuthStore } from "@/core/stores/auth.store";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Search, UserPlus } from "lucide-react";
import { Input } from "@/core/components/ui/input";
import { toast } from "sonner"; 
import ProfilePage from "@/app/(authenticated)/profile/page";


export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();
  const handleLogout = () => {
    logout();
    router.push("/");
    toast.info('Başarıyla çıkış yapıldı.');
  };

  const myProfiePage = () =>{
    router.push("/profile");
  } 

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">      
      <div className="flex h-14 items-center px-6">
        <Link className="mr-3 flex items-center space-x-2" href="/">
          <Image
            src={logoSrc}
            alt="GGHub Logo"
            width={35}
            height={22}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center ml-auto">
          <div className="max-w-lg lg:max-w-2xl">
              <form>
                  <div className="relative w-lg">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Oyun, kullanıcı veya liste ara..." className="pl-8" />
                  </div>
              </form>
          </div>
          
          <div className="pl-3">
            {/* Kullanıcı giriş yapmış mı? */}
            {isAuthenticated && user ? (
              // EVET: Profil menüsü
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-9 w-9 cursor-pointer">
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="cursor-pointer" onClick={myProfiePage}>{user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // HAYIR: Giriş ve Kayıt ol butonları
              <div className="flex items-center space-x-2">
                  <Button asChild variant="ghost">
                    <Link href="/login">
                      <LogIn className="mr-1 h-4 w-4" />
                      Giriş Yap
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">
                      <UserPlus className="mr-1 h-4 w-4" />
                      Kayıt Ol
                    </Link>
                  </Button>
                </div>
              )}
          </div>
        </div>
      </div>
    </header>
  );
} 