using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class ReviewVote
    {
        public int Id { get; set; }
        public int Value { get; set; } // +1 or -1

        public int UserId { get; set; }
        public User User { get; set; }

        public int ReviewId { get; set; }
        public Review Review { get; set; }
    }
}