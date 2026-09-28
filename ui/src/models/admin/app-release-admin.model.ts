/** Backend AppReleaseDtos aynasi (api/admin/app-release/policy). Bos surum alani "kisit yok" demektir. */
export interface AppReleasePolicy {
    maintenanceEnabled: boolean;
    maintenanceMessageTr: string | null;
    maintenanceMessageEn: string | null;
    iosMinVersion: string | null;
    iosRecommendedVersion: string | null;
    androidMinVersion: string | null;
    androidRecommendedVersion: string | null;
    iosStoreUrl: string;
    androidStoreUrl: string;
    updatedAt: string;
}
