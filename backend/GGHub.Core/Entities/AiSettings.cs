namespace GGHub.Core.Entities
{
    /// <summary>
    /// AI botlari ve Gemini butcesi icin admin panelinden degistirilen ayarlar. TEK satir (Id = 1),
    /// yoksa AiSettingsProvider varsayilanlarla olusturur. Hem WebAPI hem Worker okur; boylece
    /// ceviri tavani da tek yerden yonetilir.
    ///
    /// API anahtari BURADA DEGIL: ortam degiskeninde (Gemini__ApiKey) kalir.
    /// </summary>
    public class AiSettings
    {
        public int Id { get; set; } = 1;

        /// <summary>Motorun ana salteri. Host kapisi (AiAgents:HostEnabled) da acik olmali.</summary>
        public bool AgentsEnabled { get; set; }

        /// <summary>Ceviri (job + sitedeki buton) aylik TL tavani.</summary>
        public decimal TranslationMonthlyBudgetTry { get; set; } = 250m;

        /// <summary>Botlarin UCRETLI yedek modele dustugu cagrilarin aylik TL tavani. Gemma bu tavana islemez.</summary>
        public decimal AgentMonthlyBudgetTry { get; set; } = 250m;

        /// <summary>Google USD uzerinden fiyatlar; tavanlar TL. Kur buradan cevrilir, admin gunceller.</summary>
        public decimal UsdToTryRate { get; set; } = 47.1m;

        public string PrimaryModel { get; set; } = "gemma-4-31b-it";
        public string FallbackModel { get; set; } = "gemini-3.1-flash-lite";

        /// <summary>Ana modele dakikada en fazla kac istek (Gemma ucretsiz katmani ~15).</summary>
        public int PrimaryModelRpm { get; set; } = 12;

        public int DailyActionsPerAgent { get; set; } = 14;

        /// <summary>Gunde en fazla kac bot sohbet sahnesi acilir (tum botlar toplami).</summary>
        public int ConversationsPerDay { get; set; } = 8;

        /// <summary>Bir sahnedeki azami yanit turu (kok gonderi haric).</summary>
        public int MaxConversationTurns { get; set; } = 8;

        /// <summary>Bir kullaniciya gunde en fazla kac bot mesaji (tum botlar toplami).</summary>
        public int MaxAgentMessagesPerUserPerDay { get; set; } = 20;

        /// <summary>Kullanici yazmadan atilan (hos geldin) bot DM'i, kullanici basina haftada.</summary>
        public int MaxUnsolicitedDmPerUserPerWeek { get; set; } = 1;

        /// <summary>Bir gonderinin altina en fazla kac bot yaniti.</summary>
        public int MaxAgentRepliesPerPost { get; set; } = 2;

        /// <summary>Akis sayfasinda bot kartlarinin azami yuzdesi.</summary>
        public int FeedMaxAiSharePercent { get; set; } = 30;

        /// <summary>Botlarin kendiliginden hareket ettigi saat araligi (Istanbul). Bitis baslangictan kucukse gece yarisini asar.</summary>
        public int ActiveFromHour { get; set; } = 9;
        public int ActiveToHour { get; set; } = 1;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
