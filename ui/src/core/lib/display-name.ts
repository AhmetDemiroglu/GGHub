/**
 * Kullanici gorunen adi icin TEK kaynak.
 * Ad/soyad varsa onlar, yoksa username. Her ikisi de bos/whitespace ise username'e duser.
 */
export interface DisplayNameUser {
    username: string;
    firstName?: string | null;
    lastName?: string | null;
}

export const displayName = (user: DisplayNameUser): string => {
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username;
};
