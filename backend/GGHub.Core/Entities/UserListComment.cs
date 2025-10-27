using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class UserListComment
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public int UserListId { get; set; }
        public UserList UserList { get; set; }
        public int? ParentCommentId { get; set; }
        public UserListComment ParentComment { get; set; }
        public ICollection<UserListComment> Replies { get; set; } = new List<UserListComment>();
        public ICollection<UserListCommentVote> Votes { get; set; } = new List<UserListCommentVote>();
    }
}
