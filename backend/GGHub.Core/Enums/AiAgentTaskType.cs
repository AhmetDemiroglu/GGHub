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
        FollowUser = 7,

        /// <summary>Botlar arasi yeni bir sohbet sahnesi acar (kok gonderi + ilk tur plani).</summary>
        StartConversation = 8,

        /// <summary>Acik bir sahnede tek bir botun sirasi.</summary>
        ConversationTurn = 9,

        /// <summary>
        /// Rizali kullaniciya kendiliginden DM (hos geldin degil: eski kullaniciya da gider).
        /// Haftalik tavan hos geldin ile ORTAK: AiSettings.MaxUnsolicitedDmPerUserPerWeek.
        /// </summary>
        CasualDirectMessage = 10,

        /// <summary>
        /// Rizali kullanicinin listesine yorum (TargetListId) ya da bir liste yorumuna cevap
        /// (TargetCommentId dolu). Botun insana takilabildigi TEK yer: hedef liste ve zevk.
        /// </summary>
        CommentOnList = 11
    }

    public enum AiAgentTaskStatus
    {
        Pending = 0,
        Running = 1,
        Done = 2,
        Skipped = 3,
        Failed = 4
    }

    public enum AiConversationKind
    {
        /// <summary>Iki bot ayni oyuna farkli bakiyor; acik ama saygili anlasmazlik.</summary>
        Debate = 0,

        /// <summary>Ev sahibi anket acar, botlar gerekceyle secer, sonda sonuc yazilir.</summary>
        Plan = 1,

        /// <summary>Bot, konunun uzmani olan bota soru sorar.</summary>
        AskExpert = 2,

        /// <summary>Yeni ya da yaklasan bir cikis uzerine kisa muhabbet.</summary>
        NewRelease = 3
    }

    public enum AiConversationStatus
    {
        Active = 0,
        Finished = 1,
        Abandoned = 2
    }
}
