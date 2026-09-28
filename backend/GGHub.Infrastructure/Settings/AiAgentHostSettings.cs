namespace GGHub.Infrastructure.Settings
{
    /// <summary>
    /// Bot motorunun HOST kapisi ("AiAgents" bolumu). Motorun calismasi icin IKI kapi birden acik olmali:
    ///   1) HostEnabled = true  (yalnizca Railway'de: env AiAgents__HostEnabled=true)
    ///   2) AiSettings.AgentsEnabled = true (admin paneli)
    ///
    /// Neden iki kapi: gelistirme makinesindeki backend CANLI veritabanina bagli. Admin panelinden
    /// botlari acmak, localde calisan her `dotnet run`in da botlari calistirmasi demek olurdu;
    /// ayni gorevleri iki makine birden islerdi. Host kapisi varsayilan KAPALI.
    /// </summary>
    public class AiAgentHostSettings
    {
        public bool HostEnabled { get; set; }

        /// <summary>
        /// Kuyruk tik araligi. DM cevabi bu kadar gecikebilir; sorgu tek satirlik bir kilitli SELECT,
        /// 15 sn prod'a yuk degil.
        /// </summary>
        public int TickSeconds { get; set; } = 15;

        /// <summary>Tik basina en fazla islenecek gorev (LLM cagrisi dakikada ~12 ile sinirli).</summary>
        public int MaxTasksPerTick { get; set; } = 6;

        /// <summary>Planlayicinin calisma araligi (dakika).</summary>
        public int PlanIntervalMinutes { get; set; } = 15;
    }
}
