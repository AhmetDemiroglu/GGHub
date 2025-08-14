namespace GGHub.Core.Entities
{
    public class UserListFollow
    {
        public int FollowerUserId { get; set; }
        public User FollowerUser { get; set; }

        public int FollowedListId { get; set; }
        public UserList FollowedList { get; set; }
    }
}