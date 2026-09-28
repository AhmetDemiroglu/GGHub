namespace GGHub.Application.Dtos
{
    /// <summary>Admin paneli: politika satirinin tamami (GET/PUT api/admin/app-release/policy).</summary>
    public class AppReleasePolicyDto
    {
        public bool MaintenanceEnabled { get; set; }
        public string? MaintenanceMessageTr { get; set; }
        public string? MaintenanceMessageEn { get; set; }
        public string? IosMinVersion { get; set; }
        public string? IosRecommendedVersion { get; set; }
        public string? AndroidMinVersion { get; set; }
        public string? AndroidRecommendedVersion { get; set; }
        public string IosStoreUrl { get; set; } = string.Empty;
        public string AndroidStoreUrl { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Mobil uygulamanin acilista sordugu karar (GET api/app-release/check?platform=ios&amp;version=1.3.0).
    /// Karar SUNUCUDA verilir; istemci yalnizca Status'e bakar.
    /// </summary>
    public class AppReleaseCheckDto
    {
        /// <summary>"ok" | "recommended" | "required" | "maintenance"</summary>
        public string Status { get; set; } = AppReleaseStatus.Ok;
        public string Platform { get; set; } = string.Empty;
        public string CurrentVersion { get; set; } = string.Empty;
        public string? MinVersion { get; set; }
        public string? RecommendedVersion { get; set; }
        public string StoreUrl { get; set; } = string.Empty;
        public string? MaintenanceMessageTr { get; set; }
        public string? MaintenanceMessageEn { get; set; }
    }

    public static class AppReleaseStatus
    {
        public const string Ok = "ok";
        public const string Recommended = "recommended";
        public const string Required = "required";
        public const string Maintenance = "maintenance";
    }
}
