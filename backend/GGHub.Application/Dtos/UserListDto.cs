using GGHub.Core.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Application.Dtos
{
    public class UserListDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public ListVisibilitySetting Visibility { get; set; }
        public ListCategory Category { get; set; }
        public int GameCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int FollowerCount { get; set; }
        public double AverageRating { get; set; }
        public int RatingCount { get; set; }
        public List<string?> FirstGameImageUrls { get; set; } = new List<string?>();
        public UserDto Owner { get; set; }
    }
}
