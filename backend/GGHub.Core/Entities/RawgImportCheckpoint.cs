namespace GGHub.Core.Entities
{
    public class RawgImportCheckpoint
    {
        public int Id { get; set; }

        /// <summary>
        /// Strategy identifier, e.g. "ordering:-added", "ordering:-rating", "ordering:-metacritic"
        /// </summary>
        public string StrategyKey { get; set; } = string.Empty;

        public int CurrentPage { get; set; } = 1;

        public int TotalProcessed { get; set; }
        public int TotalAdded { get; set; }
        public int TotalSkipped { get; set; }
        public int TotalFiltered { get; set; }
        public int TotalDuplicate { get; set; }
        public int TotalUpdated { get; set; }

        /// <summary>
        /// When true, all pages for this strategy have been crawled.
        /// </summary>
        public bool IsCompleted { get; set; }

        public DateTime? LastRunAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Stores the last encountered error for diagnostics.
        /// </summary>
        public string? LastError { get; set; }
    }
}
