using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class UserListGame
    {
        public int UserListId { get; set; }
        public UserList UserList { get; set; }
        public int GameId { get; set; }
        public Game Game { get; set; }
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
        public int SortOrder { get; set; }
    }
}