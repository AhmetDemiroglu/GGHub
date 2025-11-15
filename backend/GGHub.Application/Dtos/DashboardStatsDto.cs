namespace GGHub.Application.Dtos
{
    public class DashboardStatsDto
    {
        public int TotalUsers { get; set; }
        public int BannedUsers { get; set; }
        public int PendingReports { get; set; }
        public int TotalLists { get; set; }
        public int TotalReviews { get; set; }
    }
}