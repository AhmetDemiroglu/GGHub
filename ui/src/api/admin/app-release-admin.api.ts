import { axiosInstance } from "@core/lib/axios";
import type { AppReleasePolicy } from "@/models/admin/app-release-admin.model";

/** Admin paneli "Mobil Sürüm" ekrani (backend AppReleaseAdminController, /api/admin/app-release). */
export const appReleaseAdminApi = {
    getPolicy: () => axiosInstance.get<AppReleasePolicy>("/admin/app-release/policy").then((r) => r.data),
    updatePolicy: (data: AppReleasePolicy) =>
        axiosInstance.put<AppReleasePolicy>("/admin/app-release/policy", data).then((r) => r.data),
};
