namespace GGHub.Application.Dtos
{
    public class GameQueryParams
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Search { get; set; } 
        public string? Genres { get; set; } 
        public string? Ordering { get; set; } 
    }
}