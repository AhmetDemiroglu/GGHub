import axios from "axios";

/**
 * Yorum agaci yardimcilari. Liste ve inceleme yorum bolumleri ayni mantigi
 * paylastigi icin ortak tutuldu.
 */

/** Backend her yorumu koke gomulu `replies` dizisiyle dondurur (3 seviye). */
type CommentTreeNode<T> = {
    id: number;
    replies?: T[];
};

export interface RemoveCommentResult<T> {
    items: T[];
    /** Agacin herhangi bir seviyesinden silindi mi? */
    removed: boolean;
    /** Sadece kok seviyesinden silindiyse true. totalCount yalnizca kokleri sayar. */
    removedRoot: boolean;
}

/**
 * Verilen id'yi kok listesinden VE ic ice yanitlardan ozyinelemeli olarak cikarir.
 * Eski kod sadece `items` uzerinde filter yaptigi icin yanit silmek hicbir seyi
 * eslestirmiyordu; yanit ekranda kaliyor, ikinci tiklama 404 veriyordu.
 */
export function removeCommentFromList<T extends CommentTreeNode<T>>(items: T[], commentId: number): RemoveCommentResult<T> {
    let removed = false;
    let removedRoot = false;
    const next: T[] = [];

    for (const item of items) {
        if (item.id === commentId) {
            removed = true;
            removedRoot = true;
            continue;
        }

        if (item.replies && item.replies.length > 0) {
            const childResult = removeCommentFromList(item.replies, commentId);
            if (childResult.removed) {
                removed = true;
                next.push({ ...item, replies: childResult.items } as T);
                continue;
            }
        }

        next.push(item);
    }

    return { items: removed ? next : items, removed, removedRoot };
}

/** Silinmis bir yoruma yapilan islem 404 doner. Bu bir hata degil, "zaten yok" demektir. */
export const isNotFoundError = (error: unknown): boolean => {
    return axios.isAxiosError(error) && error.response?.status === 404;
};

/**
 * Ham axios mesaji ("Request failed with status code 404") Turkce arayuze
 * sizmasin diye hatayi ceviri anahtarina indirger.
 */
export const commentErrorReason = (error: unknown): string => {
    if (!axios.isAxiosError(error)) {
        return "unknown";
    }

    if (!error.response) {
        return "network";
    }

    const status = error.response.status;
    if (status === 400) return "invalid";
    if (status === 401) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 404) return "notFound";
    if (status === 429) return "rateLimited";
    if (status >= 500) return "server";

    return "unknown";
};
