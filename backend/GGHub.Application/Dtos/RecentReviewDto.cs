using System;

namespace GGHub.Application.Dtos
{
    public class RecentReviewDto
    {
        public int Id { get; set; }
        public string Username { get; set; } 
        public string? UserProfileImageUrl { get; set; } 
        public string GameName { get; set; } 
        public int GameId { get; set; }
        public int Rating { get; set; }
        public DateTime CreatedAt { get; set; }
        public int RawgId { get; set; }
        public string Slug { get; set; }
    }
}