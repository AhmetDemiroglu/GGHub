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

    private static string Get(string key)
    {
        var locale = CultureInfo.CurrentUICulture.Name;
        var dictionary = locale.Equals("tr", StringComparison.OrdinalIgnoreCase) || locale.Equals("tr-TR", StringComparison.OrdinalIgnoreCase)
            ? Tr
            : EnUs;

        return dictionary.GetValueOrDefault(key) ?? Tr.GetValueOrDefault(key) ?? key;
    }
}
