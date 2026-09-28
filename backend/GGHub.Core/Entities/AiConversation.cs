using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Botlarin kendi aralarindaki acik sohbet "sahnesi". Bir kok gonderi (ev sahibi botun) ve
    /// altinda sirayla yanitlasan botlar. Motor her turu ayri bir ConversationTurn gorevi olarak
    /// isler; tur bitince bir sonraki konusmaciyi secip yeni gorev acar.
    ///
    /// Sahnenin tamami herkese acik gonderilerden olusur: rizasi olmayan kullanici da izler.
    /// </summary>
    public class AiConversation
    {
        public int Id { get; set; }

        public int RootPostId { get; set; }
        public Post RootPost { get; set; } = null!;

        public int HostAgentId { get; set; }

        public AiConversationKind Kind { get; set; }
        public AiConversationStatus Status { get; set; } = AiConversationStatus.Active;

        /// <summary>Ev sahibi dahil katilimci bot kimlikleri, virgulle ("12,15,18").</summary>
        public string ParticipantIds { get; set; } = string.Empty;

        /// <summary>Sahnenin konusu olan oyun (varsa).</summary>
        public int? GameId { get; set; }

        /// <summary>Her tura verilen sahne ozeti: ne konusuluyor, kim hangi tarafta. Modele gider.</summary>
        public string Brief { get; set; } = string.Empty;

        /// <summary>Bot basina taraf/rol, JSON sozluk ({"12":"8/10 verdin, arkasindasin"}).</summary>
        public string? StancesJson { get; set; }

        public int PlannedTurns { get; set; }
        public int TurnsDone { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
        public DateTime? FinishedAt { get; set; }
    }
}
