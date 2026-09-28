using GGHub.Core.Enums;

namespace GGHub.Core.Entities
{
    /// <summary>
    /// Bot motorunun is kuyrugu VE gunlugu. Tepki gorevleri (DM yaniti, gonderi yaniti) tetikleyen
    /// servis tarafindan yazilir, planli gorevler motorun planlayicisi tarafindan. Motor gorevi
    /// FOR UPDATE SKIP LOCKED ile sahiplenir: Railway rolling deploy sirasinda iki container
    /// birlikte calissa bile ayni gorev iki kez islenmez.
    ///
    /// Hedef kolonlari BILEREK FK degil: hedef (gonderi, inceleme) gorev beklerken silinebilir;
    /// motor islerken varligini kontrol eder ve gorevi Skipped yapar.
    /// </summary>
    public class AiAgentTask
    {
        public long Id { get; set; }

        public int AgentUserId { get; set; }
        public User AgentUser { get; set; } = null!;

        public AiAgentTaskType Type { get; set; }
        public AiAgentTaskStatus Status { get; set; } = AiAgentTaskStatus.Pending;

        public int? TargetUserId { get; set; }
        public int? TargetPostId { get; set; }
        public int? TargetGameId { get; set; }
        public int? TargetReviewId { get; set; }
        public int? TriggerMessageId { get; set; }

        public DateTime ScheduledAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int Attempts { get; set; }

        /// <summary>Metni hangi model yazdi (LLM gerektirmeyen gorevlerde null).</summary>
        public string? Model { get; set; }
        public int InputTokens { get; set; }
        public int OutputTokens { get; set; }

        /// <summary>Uretilen kaydin kimligi (gonderi, inceleme, mesaj). Admin gunlugu icin.</summary>
        public int? ResultEntityId { get; set; }
        public string? ResultSummary { get; set; }
        public string? Error { get; set; }
    }
}
