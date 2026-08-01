using System;
using System.Collections.Generic;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Gonderiye bagli anket. Gonderi basina EN FAZLA BIR anket
    /// (PostId uzerinde unique index).
    /// </summary>
    public class PostPoll
    {
        public int Id { get; set; }

        public int PostId { get; set; }
        public Post Post { get; set; }

        /// <summary>Bitis zamani. Olusturmada 1-7 gun araligina kisitlanir.</summary>
        public DateTime EndsAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<PostPollOption> Options { get; set; } = new List<PostPollOption>();
        public ICollection<PostPollVote> Votes { get; set; } = new List<PostPollVote>();
    }
}
