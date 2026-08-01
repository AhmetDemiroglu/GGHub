using System.Globalization;

namespace GGHub.Application.Localization;

public static class AppValidationText
{
    private static readonly IReadOnlyDictionary<string, string> Tr = new Dictionary<string, string>
    {
        ["validation.commentContentRequired"] = "Yorum içeriği boş olamaz.",
        ["validation.commentContentLength"] = "Yorum 1 ila 1000 karakter arasında olmalıdır.",
        ["validation.voteValueRequired"] = "Oy değeri zorunludur.",
        ["validation.voteValueRange"] = "Oy değeri 1 (upvote) veya -1 (downvote) olmalıdır. 0 geçerli değildir.",
        ["validation.listNameRequired"] = "Liste adı zorunludur.",
        ["validation.listNameLength"] = "Liste adı 3 ila 100 karakter arasında olmalıdır.",
        ["validation.listDescriptionLength"] = "Açıklama en fazla 500 karakter olabilir.",
        ["validation.ratingValueRequired"] = "Puan değeri zorunludur.",
        ["validation.ratingValueRange"] = "Puan 1 ile 5 arasında olmalıdır.",
        ["validation.postContentLength"] = "Gönderi en fazla 200 karakter olabilir.",
        ["validation.postEmpty"] = "Gönderi boş olamaz. Metin, görsel veya anket ekleyin.",
        ["validation.postImageCount"] = "Bir gönderiye en fazla 4 görsel eklenebilir.",
        ["validation.pollOptionCount"] = "Anket 2 ila 4 seçenek içermelidir.",
        ["validation.pollOptionLength"] = "Anket seçeneği 1 ila 40 karakter arasında olmalıdır.",
        ["validation.pollDurationRange"] = "Anket süresi 1 ile 7 gün arasında olmalıdır.",
    };

    private static readonly IReadOnlyDictionary<string, string> EnUs = new Dictionary<string, string>
    {
        ["validation.commentContentRequired"] = "Comment content cannot be empty.",
        ["validation.commentContentLength"] = "Comment must be between 1 and 1000 characters.",
        ["validation.voteValueRequired"] = "Vote value is required.",
        ["validation.voteValueRange"] = "Vote value must be 1 (upvote) or -1 (downvote). 0 is not valid.",
        ["validation.listNameRequired"] = "List name is required.",
        ["validation.listNameLength"] = "List name must be between 3 and 100 characters.",
        ["validation.listDescriptionLength"] = "Description can be at most 500 characters.",
        ["validation.ratingValueRequired"] = "Rating value is required.",
        ["validation.ratingValueRange"] = "Rating must be between 1 and 5.",
        ["validation.postContentLength"] = "A post can be at most 200 characters.",
        ["validation.postEmpty"] = "A post cannot be empty. Add text, an image or a poll.",
        ["validation.postImageCount"] = "A post can have at most 4 images.",
        ["validation.pollOptionCount"] = "A poll must have between 2 and 4 options.",
        ["validation.pollOptionLength"] = "A poll option must be between 1 and 40 characters.",
        ["validation.pollDurationRange"] = "Poll duration must be between 1 and 7 days.",
    };

    public static string CommentContentRequired => Get("validation.commentContentRequired");
    public static string CommentContentLength => Get("validation.commentContentLength");
    public static string VoteValueRequired => Get("validation.voteValueRequired");
    public static string VoteValueRange => Get("validation.voteValueRange");
    public static string ListNameRequired => Get("validation.listNameRequired");
    public static string ListNameLength => Get("validation.listNameLength");
    public static string ListDescriptionLength => Get("validation.listDescriptionLength");
    public static string RatingValueRequired => Get("validation.ratingValueRequired");
    public static string RatingValueRange => Get("validation.ratingValueRange");
    public static string PostContentLength => Get("validation.postContentLength");
    public static string PostEmpty => Get("validation.postEmpty");
    public static string PostImageCount => Get("validation.postImageCount");
    public static string PollOptionCount => Get("validation.pollOptionCount");
    public static string PollOptionLength => Get("validation.pollOptionLength");
    public static string PollDurationRange => Get("validation.pollDurationRange");

    private static string Get(string key)
    {
        var locale = CultureInfo.CurrentUICulture.Name;
        var dictionary = locale.Equals("tr", StringComparison.OrdinalIgnoreCase) || locale.Equals("tr-TR", StringComparison.OrdinalIgnoreCase)
            ? Tr
            : EnUs;

        return dictionary.GetValueOrDefault(key) ?? Tr.GetValueOrDefault(key) ?? key;
    }
}
