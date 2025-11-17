namespace GGHub.Application.Dtos
{
    public class UserFilterParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 15;
        public string? SearchTerm { get; set; }
        public string? StatusFilter { get; set; } = "All";
        public string SortBy { get; set; } = "CreatedAt";
        public string SortDirection { get; set; } = "desc";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}