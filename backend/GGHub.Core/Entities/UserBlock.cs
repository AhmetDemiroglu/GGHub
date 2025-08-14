namespace GGHub.Core.Entities
{
    public class UserBlock
    {
        public int BlockerId { get; set; } 
        public User Blocker { get; set; }

        public int BlockedId { get; set; }
        public User Blocked { get; set; }
    }
}