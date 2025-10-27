using GGHub.Core.Enums;
using System;

namespace GGHub.Application.Dtos
{
    public class UserListPublicDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public ListCategory Category { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int GameCount { get; set; }
        public int FollowerCount { get; set; }
        public double AverageRating { get; set; }
        public int RatingCount { get; set; }
        public UserDto Owner { get; set; }
    }
}