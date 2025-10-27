using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class UserListRating
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int UserListId { get; set; }
        public UserList UserList { get; set; }

        public int Value { get; set; }
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    }
}
