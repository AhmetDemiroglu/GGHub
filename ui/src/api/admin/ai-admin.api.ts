import { axiosInstance } from "@core/lib/axios";
import type { AiAgentAdmin, AiAgentUpdate, AiPurgeReport, AiSettings, AiUsageReport } from "@/models/admin/ai-admin.model";

/** Admin paneli AI ekrani (backend AiAdminController, /api/admin/ai). */
export const aiAdminApi = {
    getSettings: () => axiosInstance.get<AiSettings>("/admin/ai/settings").then((r) => r.data),
    updateSettings: (data: AiSettings) => axiosInstance.put<AiSettings>("/admin/ai/settings", data).then((r) => r.data),
    getAgents: () => axiosInstance.get<AiAgentAdmin[]>("/admin/ai/agents").then((r) => r.data),
    provisionAgents: () => axiosInstance.post<{ created: number }>("/admin/ai/agents/provision").then((r) => r.data),
    updateAgent: (userId: number, data: AiAgentUpdate) => axiosInstance.put(`/admin/ai/agents/${userId}`, data),
    getUsage: (days = 30) => axiosInstance.get<AiUsageReport>(`/admin/ai/usage?days=${days}`).then((r) => r.data),
    // Temizlik buyuk tablolarda uzun surebilir; varsayilan 15 sn istemci zaman asimi burada yetmez.
    purgePreview: () =>
        axiosInstance.get<AiPurgeReport>("/admin/ai/purge-fake/preview", { timeout: 300_000 }).then((r) => r.data),
    purge: (confirmation: string) =>
        axiosInstance.post<AiPurgeReport>("/admin/ai/purge-fake", { confirmation }, { timeout: 300_000 }).then((r) => r.data),
};
