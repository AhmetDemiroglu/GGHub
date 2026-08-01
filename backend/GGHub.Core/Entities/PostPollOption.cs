using System.Collections.Generic;

namespace GGHub.Core.Entities
{
    /// <summary>Anket secenegi. Anket basina 2-4 adet.</summary>
    public class PostPollOption
    {
        public int Id { get; set; }

        public int PollId { get; set; }
        public PostPoll Poll { get; set; }

        public string Text { get; set; } = string.Empty;

        public int Position { get; set; }

        /// <summary>Denormalize; oy islemiyle ayni SaveChangesAsync icinde artar.</summary>
        public int VoteCount { get; set; }

        public ICollection<PostPollVote> Votes { get; set; } = new List<PostPollVote>();
    }
}
