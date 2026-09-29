import type { UserListDetail, UserListPublic } from "@/models/list/list.model";
import type { PaginatedResponse } from "@/models/system/api.model";
import { serverGet } from "@/api/server-fetch";

/** Herkese acik listelerin filtresiz ilk sayfasi (anonim istek: yalniz Public listeler). */
export const getPublicListsFirstPageServer = (pageSize: number) =>
    serverGet<PaginatedResponse<UserListPublic>>(`/api/user-lists/public?page=1&pageSize=${pageSize}`, { revalidate: 300, tags: ["public-lists-first-page"] });

/**
 * Liste detayi anonim cekilir: Public olmayan liste 401 doner, sayfa bunu "erisilemez"
 * (noindex) sayar; giris yapmis sahibi/takipcisi icin istemci kendi yetkili istegini atar.
 */
export const getListDetailServer = (listId: number) =>
    serverGet<UserListDetail>(`/api/user-lists/${listId}`, { revalidate: 300, tags: [`list-${listId}`] });
