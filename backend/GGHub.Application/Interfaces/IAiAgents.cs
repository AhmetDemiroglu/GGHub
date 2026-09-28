namespace GGHub.Application.Interfaces
{
    /// <summary>AI bot hesaplarinin kimlik kumesi (5 dk onbellekli). Bot sayisi kucuk (~10).</summary>
    public interface IAiAgentDirectory
    {
        Task<IReadOnlySet<int>> GetAgentIdsAsync(CancellationToken cancellationToken = default);

        Task<bool> IsAgentAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>Bir dil grubunun ("tr" | "en") ACIK bot kimlikleri (5 dk onbellekli).</summary>
        Task<IReadOnlySet<int>> GetAgentIdsAsync(string language, CancellationToken cancellationToken = default);

        /// <summary>Bot eklenince/silinince cagrilir.</summary>
        void Invalidate();
    }

    /// <summary>
    /// Botlarin bir kullaniciyla etkilesime girip giremeyecegi: DOB dolu, yas 18+, ayar acik,
    /// banli/silinmis degil. Tek karar noktasi; kurallar GGHub.Core.Specifications.AiInteractionRules.
    /// </summary>
    public interface IAiInteractionPolicy
    {
        Task<bool> CanInteractAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>Etkilesim engelinin sebebi (AiInteractionBlockReasons) ya da null.</summary>
        Task<string?> GetBlockReasonAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Kullanici bir bota YAZACAK (DM, bot gonderisine yanit, botu etiketleme, bot incelemesine
        /// yorum). Uygun degilse AiConsentRequiredException firlatir (403 ai_consent_required).
        /// Botun kendisi icin serbest.
        /// </summary>
        Task EnsureCanWriteToAgentsAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Metin bir botu "@kullaniciadi" ile etiketliyorsa EnsureCanWriteToAgentsAsync uygular.
        /// Inceleme, inceleme yorumu ve liste yorumu icin: bu metinlerde etiket duz yazimdir, token degil
        /// (gonderiler token'la calisir ve PostService kendi kontrolunu yapar).
        /// </summary>
        Task EnsureCanMentionAgentsAsync(int userId, string? content, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Bot motoruna tepki gorevi birakan olay kancasi. Mevcut servisler kayittan SONRA cagirir.
    /// BEST-EFFORT: hicbir metodu istisna firlatmaz; bot tarafindaki bir hata kullanicinin
    /// gonderisini, mesajini ya da incelemesini asla bozmaz.
    /// </summary>
    public interface IAiAgentEvents
    {
        Task OnDirectMessageAsync(int senderId, int recipientId, int messageId);

        Task OnPostCreatedAsync(int postId, int authorId, int? parentPostId, IReadOnlyCollection<int> mentionedUserIds);

        Task OnReviewCreatedAsync(int reviewId, int authorId);

        /// <summary>Bot incelemesine insan yorumu geldi: inceleme sahibi bot cevap verir.</summary>
        Task OnReviewCommentCreatedAsync(int reviewId, int commentId, int authorId);
    }
}
