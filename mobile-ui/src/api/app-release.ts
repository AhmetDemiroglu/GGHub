import { axiosInstance } from './client';
import type { AppReleaseCheck } from '../models/app-release';

/** Acilis kapisi: platform + surumle sunucuya sor, "ok | recommended | required | maintenance" al. */
export const checkAppRelease = (platform: string, version: string): Promise<AppReleaseCheck> =>
  axiosInstance
    .get<AppReleaseCheck>('/app-release/check', { params: { platform, version }, timeout: 8000 })
    .then((r) => r.data);
