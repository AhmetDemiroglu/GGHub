import type { Metadata } from "next";
import ProfileContent from "@core/components/other/profile/profile-content";
import { getProfileServer } from "@/api/profile/profile.server";
import { getMessages, translate } from "@/i18n";
import { resolveLocaleFromParams } from "@/i18n/server";
import { seoCopy } from "@/core/seo/copy";
import { buildNotFoundMetadata, buildPageMetadata } from "@/core/seo/metadata";
import { JsonLd, breadcrumbJsonLd, profilePageJsonLd } from "@/core/seo/json-ld";
import { displayNameOf, truncate } from "@/core/seo/text";

/**
 * Oyuncu profili. Herkese acik profil sunucuda anonim cekilir; takipcilere ozel/gizli profil
 * anonim istege 404 doner (ProfileAccess.CanView). Bu yuzden 404'te sert notFound() YOK:
 * giris yapmis takipci ayni URL'i gorebilir, istemci kendi yetkili istegini atar. Sayfa yalnizca
 * noindex kalir.
 */
type Props = { params: Promise<{ username: string; locale?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: profile, status } = await getProfileServer(username);

    if (!profile) {
        return status === 0 || status >= 500
            ? { title: seoCopy(locale, "siteTitle") }
            : buildNotFoundMetadata(seoCopy(locale, "profileNotFoundTitle"), seoCopy(locale, "profileNotFoundDescription"));
    }

    const name = displayNameOf(profile);

    return buildPageMetadata({
        locale,
        path: `/profiles/${profile.username}`,
        title: seoCopy(locale, "profileTitle", { name, username: profile.username }),
        description: profile.bio ? truncate(profile.bio, 160) : seoCopy(locale, "profileDescription", { name }),
        image: profile.profileImageUrl ? { url: profile.profileImageUrl, alt: name } : null,
        type: "profile",
    });
}

export default async function Page({ params }: Props) {
    const { username } = await params;
    const locale = await resolveLocaleFromParams(params);
    const { data: profile } = await getProfileServer(username);
    const messages = getMessages(locale);

    return (
        <>
            {profile ? (
                <JsonLd
                    data={[
                        profilePageJsonLd(profile, locale),
                        breadcrumbJsonLd(locale, [
                            { name: translate(messages, "nav.home"), path: "/" },
                            { name: displayNameOf(profile), path: `/profiles/${profile.username}` },
                        ]),
                    ]}
                />
            ) : null}
            <ProfileContent username={username} initialProfile={profile} />
        </>
    );
}
