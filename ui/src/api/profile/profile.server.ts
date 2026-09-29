import type { PublicProfile } from "@/models/profile/profile.model";
import { serverGet } from "@/api/server-fetch";

/** Anonim profil istegi: Public olmayan profil 404 doner (ProfileAccess.CanView), sayfa noindex kalir. */
export const getProfileServer = (username: string) =>
    serverGet<PublicProfile>(`/api/profiles/${encodeURIComponent(username)}`, { revalidate: 120, tags: [`profile-${username.toLowerCase()}`] });
