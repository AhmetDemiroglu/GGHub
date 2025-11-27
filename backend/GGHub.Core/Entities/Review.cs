using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class Review
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public int Rating { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } 
        public int GameId { get; set; }
        public Game Game { get; set; }
        public ICollection<ReviewVote> ReviewVotes { get; set; } = new List<ReviewVote>();
    }
}