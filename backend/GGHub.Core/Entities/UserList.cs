using GGHub.Core.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class UserList
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public ListVisibilitySetting Visibility { get; set; } 
        public ListCategory Category { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public ICollection<UserListGame> UserListGames { get; set; } = new List<UserListGame>();
        public ICollection<UserListFollow> Followers { get; set; } = new List<UserListFollow>();
        public double AverageRating { get; set; } = 0;
        public int RatingCount { get; set; } = 0;
        public ICollection<UserListComment> Comments { get; set; } = new List<UserListComment>();
        public UserListType Type { get; set; } = UserListType.Custom;
    }
}
