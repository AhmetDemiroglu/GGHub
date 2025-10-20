import Image from "next/image";
import logoSrc from "@core/assets/logo.png";
import Link from "next/link";
import { useAuthStore } from "@/core/stores/auth.store";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/core/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/models/profile/profile.model";
import { getMyProfile } from "@/api/profile/profile.api";
import { useQuery } from "@tanstack/react-query";
import { SearchBar } from "@/core/components/other/search/search-bar";

export function Header() {
    const { isAuthenticated, user, logout } = useAuthStore();

    const enabled = isAuthenticated && !!user;
    const { data } = useQuery<Profile>({
        queryKey: ["my-profile"],
        queryFn: getMyProfile,
        enabled,
        staleTime: 5 * 60 * 1000,
    });
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    const avatarSrc = data?.profileImageUrl ? `${API_BASE}${data.profileImageUrl}` : undefined;

    const router = useRouter();
    const handleLogout = () => {
        logout();
        router.push("/");
        toast.info("Başarıyla çıkış yapıldı.");
    };

    const myProfiePage = () => {
        if (user) {
            router.push(`/profiles/${user.username}`);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-6">
                <Link className="mr-3 flex items-center space-x-2" href="/">
                    <Image src={logoSrc} alt="GGHub Logo" width={35} height={22} priority className="h-8 w-auto" />
                </Link>
                <div className="flex items-center ml-auto mr-1">
                    <SearchBar />

                    <div className="pl-5 mt-3">
                        {/* Kullanıcı giriş yapmış mı? */}
                        {isAuthenticated && user ? (
                            // EVET: Profil menüsü
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-10 w-10 cursor-pointer">
                                            <AvatarImage src={avatarSrc} alt={user.username} />
                                            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    <DropdownMenuLabel className="cursor-pointer" onClick={myProfiePage}>
                                        {user.username}
                                    </DropdownMenuLabel>
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
