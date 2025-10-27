using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class UserListCommentVote
    {
        public int UserId { get; set; }
        public User User { get; set; }
        public int UserListCommentId { get; set; }
        public UserListComment UserListComment { get; set; }
        public int Value { get; set; }
    }
}