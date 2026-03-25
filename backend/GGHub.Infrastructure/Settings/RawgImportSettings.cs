namespace GGHub.Infrastructure.Settings
{
    public class RawgImportSettings
    {
        /// <summary>
        /// Master switch for the import job.
        /// </summary>
        public bool Enabled { get; set; }

        /// <summary>
        /// Number of games per RAWG API page request (max 40).
        /// </summary>
        public int PageSize { get; set; } = 40;

        /// <summary>
        /// Delay between consecutive RAWG API requests in milliseconds.
        /// </summary>
        public int DelayBetweenRequestsMs { get; set; } = 1500;

        /// <summary>
        /// Maximum pages to process per run cycle before pausing.
        /// </summary>
        public int MaxPagesPerRun { get; set; } = 25;

        /// <summary>
        /// Interval between run cycles in minutes.
        /// </summary>
        public int RunIntervalMinutes { get; set; } = 10;

        /// <summary>
        /// Minimum ratings_count to accept a game (filters low-engagement junk).
        /// </summary>
        public int MinRatingsCount { get; set; } = 10;

        /// <summary>
        /// Minimum added count to accept a game.
        /// </summary>
        public int MinAdded { get; set; } = 20;

        /// <summary>
        /// Minimum RAWG rating (0-5 scale) to accept a game. Set to 0 to disable.
        /// </summary>
        public double MinRating { get; set; } = 0;

        /// <summary>
        /// RAWG ordering strategies to cycle through.
        /// Executed in order; each strategy is tracked independently.
        /// </summary>
        public string[] Strategies { get; set; } = new[]
        {
            "-added",
            "-rating",
            "-metacritic",
            "-released"
        };

        /// <summary>
        /// Backoff delay in milliseconds when a 429 (rate limit) response is received.
        /// </summary>
        public int RateLimitBackoffMs { get; set; } = 60_000;

        /// <summary>
        /// Backoff delay in milliseconds when a 5xx server error is received.
        /// </summary>
        public int ServerErrorBackoffMs { get; set; } = 30_000;

        /// <summary>
        /// Maximum consecutive errors before stopping the current run.
        /// </summary>
        public int MaxConsecutiveErrors { get; set; } = 5;

        /// <summary>
        /// Slug patterns that indicate junk/spam games. Case-insensitive partial match.
        /// </summary>
        public string[] JunkSlugPatterns { get; set; } = new[]
        {
            "-test-",
            "-demo-version",
            "placeholder",
            "-prototype-",
            "untitled-game",
            "-fangame"
        };

        /// <summary>
        /// Name patterns that indicate junk/spam games. Case-insensitive partial match.
        /// </summary>
        public string[] JunkNamePatterns { get; set; } = new[]
        {
            "test game",
            "my first game",
            "untitled game",
            "placeholder",
            "prototype",
            "[removed]"
        };
    }
}
