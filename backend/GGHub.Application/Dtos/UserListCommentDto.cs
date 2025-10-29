using System;

namespace GGHub.Application.Dtos
{
    public class UserListCommentDto
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public UserDto Owner { get; set; }
        public int ListId { get; set; }
        public int? ParentCommentId { get; set; }
        public int Upvotes { get; set; }
        public int Downvotes { get; set; }
        public int CurrentUserVote { get; set; }
        public List<UserListCommentDto> Replies { get; set; } = new List<UserListCommentDto>();

    }
}