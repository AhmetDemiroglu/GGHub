"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { AiBadge } from "@/core/components/base/ai-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar";
import { useLocalizedHref } from "@/core/hooks/use-localized-href";
import { displayName, type DisplayNameUser } from "@/core/lib/display-name";
import { getImageUrl } from "@/core/lib/get-image-url";
import { cn } from "@/core/lib/utils";

/**
 * UserLink'in ihtiyac duydugu minimum kullanici sekli. SocialProfile / UserDto / ListOwner /
 * LeaderboardUser gibi tiplerin hepsi yapisal olarak bununla uyumlu.
 */
export interface UserLinkUser extends DisplayNameUser {
    profileImageUrl?: string | null;
    /**
     * false ise profil sayfasi 404 doner (gizli hesap), o yuzden link yerine duz metin basilir.
     * undefined = bilgi tasinmiyor demektir; bu durumda link acilir.
     */
    isProfileAccessible?: boolean;
    /** AI bot hesabi: "name" ve "inline" varyantlarinda adin yanina AI rozeti basilir. */
    isAiAgent?: boolean;
}

type UserLinkVariant = "avatar" | "name" | "inline";

interface UserLinkProps {
    user: UserLinkUser;
    /** avatar: sadece avatar | name: gorunen ad | inline: @mention rozeti. Varsayilan "name". */
    variant?: UserLinkVariant;
    className?: string;
    /** Avatar boyutlandirmasi (variant="avatar"). */
    avatarClassName?: string;
    /** Avatar fallback icerigi; verilmezse username'in ilk iki harfi. */
    avatarFallback?: ReactNode;
    /** Popover/dialog kapatmak isteyen cagiranlar icin. */
    onNavigate?: () => void;
    /** Verilirse variant yerine bu icerik linklenir (kompozit satirlar icin). */
    children?: ReactNode;
    "aria-label"?: string;
    title?: string;
}

/** Kullanicinin gorunen adini basar. Tek satirlik ama displayName() tek kaynak kalsin diye burada. */
export function UserDisplayName({ user, className }: { user: DisplayNameUser & { isAiAgent?: boolean }; className?: string }) {
    return (
        <span className={className}>
            {displayName(user)}
            {user.isAiAgent && <AiBadge className="ml-1" />}
        </span>
    );
}

export function UserLink({
    user,
    variant = "name",
    className,
    avatarClassName,
    avatarFallback,
    onNavigate,
    children,
    "aria-label": ariaLabel,
    title,
}: UserLinkProps) {
    const localizeHref = useLocalizedHref();
    const name = displayName(user);
    const isAccessible = user.isProfileAccessible !== false;

    const variantContent = () => {
        switch (variant) {
            case "avatar":
                return (
                    <Avatar className={avatarClassName}>
                        <AvatarImage src={getImageUrl(user.profileImageUrl)} alt={name} />
                        <AvatarFallback>{avatarFallback ?? user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                );
            case "inline":
                return (
                    <>
                        @{user.username}
                        {user.isAiAgent && <AiBadge className="ml-1" />}
                    </>
                );
            case "name":
            default:
                return (
                    <>
                        {name}
                        {user.isAiAgent && <AiBadge className="ml-1" />}
                    </>
                );
        }
    };

    const content = children ?? variantContent();

    // Gizli profil linklenmez: /profiles/{gizli} zaten 404 doner, link olu uc olurdu.
    // Tipografi ayni kalsin diye className aynen span'e de veriliyor.
    if (!isAccessible) {
        return (
            <span className={className} title={title}>
                {content}
            </span>
        );
    }

    return (
        <Link
            href={localizeHref(`/profiles/${user.username}`)}
            className={cn("cursor-pointer", className)}
            onClick={onNavigate}
            aria-label={ariaLabel ?? (variant === "avatar" ? name : undefined)}
            title={title}
        >
            {content}
        </Link>
    );
}
