/** Backend AppReleaseDtos aynasi (api/app-release/check). Karar sunucuda verilir. */
export type AppReleaseStatus = 'ok' | 'recommended' | 'required' | 'maintenance';

export interface AppReleaseCheck {
  status: AppReleaseStatus;
  platform: 'ios' | 'android';
  currentVersion: string;
  minVersion: string | null;
  recommendedVersion: string | null;
  storeUrl: string;
  maintenanceMessageTr: string | null;
  maintenanceMessageEn: string | null;
}
