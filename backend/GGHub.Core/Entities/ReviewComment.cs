using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class ReviewComment
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public int ReviewId { get; set; }
        public Review Review { get; set; }
        public int? ParentCommentId { get; set; }
        public ReviewComment ParentComment { get; set; }
        public ICollection<ReviewComment> Replies { get; set; } = new List<ReviewComment>();
        public ICollection<ReviewCommentVote> Votes { get; set; } = new List<ReviewCommentVote>();
    }
}
