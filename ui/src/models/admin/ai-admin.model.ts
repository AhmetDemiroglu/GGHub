/** Backend AiAdminDtos aynasi (api/admin/ai/*). */

export interface AiSettings {
    agentsEnabled: boolean;
    translationMonthlyBudgetTry: number;
    agentMonthlyBudgetTry: number;
    usdToTryRate: number;
    primaryModel: string;
    fallbackModel: string;
    primaryModelRpm: number;
    dailyActionsPerAgent: number;
    maxAgentMessagesPerUserPerDay: number;
    maxUnsolicitedDmPerUserPerWeek: number;
    maxAgentRepliesPerPost: number;
    feedMaxAiSharePercent: number;
    activeFromHour: number;
    activeToHour: number;
    updatedAt: string;
    /** Salt okunur: sunucunun host kapisi (Railway env AiAgents__HostEnabled). */
    hostEnabled: boolean;
    knownModels: string[];
}

export interface AiAgentAdmin {
    userId: number;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
    bio: string | null;
    personaKey: string;
    persona: string;
    favoriteGenres: string;
    ratingBias: number;
    dailyActionQuota: number;
    isEnabled: boolean;
    followerCount: number;
    postCount: number;
    reviewCount: number;
    tasksToday: number;
    lastActivityAt: string | null;
}

export interface AiAgentUpdate {
    isEnabled: boolean;
    persona: string;
    favoriteGenres: string;
    ratingBias: number;
    dailyActionQuota: number;
}

export interface AiBudgetStatus {
    source: "translation" | "ai-agent" | string;
    periodKey: string;
    spentTry: number;
    limitTry: number;
    spentUsd: number;
    limitUsd: number;
    callCount: number;
    inputTokens: number;
    outputTokens: number;
    spentTodayTry: number;
    dailyShareTry: number;
}

export interface AiUsageRow {
    day: string;
    source: string;
    model: string;
    callCount: number;
    inputTokens: number;
    outputTokens: number;
    spentUsd: number;
    spentTry: number;
}

export interface AiTaskStat {
    type: string;
    status: string;
    count: number;
}

export interface AiTaskLog {
    id: number;
    agentUsername: string;
    type: string;
    status: string;
    scheduledAt: string;
    completedAt: string | null;
    model: string | null;
    inputTokens: number;
    outputTokens: number;
    targetUsername: string | null;
    resultSummary: string | null;
    error: string | null;
}

export interface AiUsageReport {
    budgets: AiBudgetStatus[];
    daily: AiUsageRow[];
    taskStats24h: AiTaskStat[];
    recentTasks: AiTaskLog[];
}

export interface AiPurgeReport {
    dryRun: boolean;
    counts: Record<string, number>;
    affectedGames: number;
    affectedPosts: number;
    affectedLists: number;
}
