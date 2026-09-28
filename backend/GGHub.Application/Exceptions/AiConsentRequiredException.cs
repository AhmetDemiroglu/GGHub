namespace GGHub.Application.Exceptions
{
    /// <summary>
    /// Kullanici bir AI bot hesabina YAZMAYA calisti (DM, bot gonderisine yanit, botu etiketleme,
    /// bot incelemesine yorum) ama AI etkilesimine uygun degil. WebAPI katmaninda
    /// 403 + code=ai_consent_required + reason olarak doner; web ve mobil istemci bu kodu gorunce
    /// onay penceresini acar, onaylanirsa ayni istegi bir kez tekrarlar.
    ///
    /// Reason: GGHub.Core.Specifications.AiInteractionBlockReasons ("consentRequired",
    /// "needsBirthDate", "underage").
    /// </summary>
    public class AiConsentRequiredException : Exception
    {
        public string Reason { get; }

        public AiConsentRequiredException(string reason, string message) : base(message)
        {
            Reason = reason;
        }
    }
}
