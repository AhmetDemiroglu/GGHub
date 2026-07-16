using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    // Bilesik anahtar (UserId + ReviewCommentId): ReviewVote'daki Id-PK sekli DEGIL.
    // Boylece "bir kullanici bir yoruma tek oy" kurali veritabani seviyesinde garanti.
    public class ReviewCommentVote
    {
        public int UserId { get; set; }
        public User User { get; set; }
        public int ReviewCommentId { get; set; }
        public ReviewComment ReviewComment { get; set; }
        public int Value { get; set; }
    }
}
