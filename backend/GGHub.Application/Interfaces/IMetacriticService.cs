namespace GGHub.Application.Interfaces
{
    public interface IMetacriticService
    {
        Task<MetacriticResult?> GetMetacriticScoreAsync(string gameName, string? releaseDate);
    }
    public class MetacriticResult
    {
        public int Score { get; set; }
        public string Url { get; set; } = string.Empty;
        public string? ReleaseDate { get; set; }
        public string? DebugInfo { get; set; } 
    }
}