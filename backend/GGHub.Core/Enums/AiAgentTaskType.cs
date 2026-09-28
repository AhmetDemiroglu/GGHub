namespace GGHub.Core.Enums
{
    public enum AiAgentTaskType
    {
        ReplyToDirectMessage = 0,
        WelcomeDirectMessage = 1,
        ReplyToPost = 2,
        CreatePost = 3,
        ReviewGame = 4,
        CommentOnReview = 5,
        LikePost = 6,
        FollowUser = 7
    }

    public enum AiAgentTaskStatus
    {
        Pending = 0,
        Running = 1,
        Done = 2,
        Skipped = 3,
        Failed = 4
    }
}
