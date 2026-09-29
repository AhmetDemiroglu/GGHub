namespace GGHub.Core.Enums
{
    /// <summary>Hatanin nereden geldigi. Sayilar DB'de saklanir, SONA eklenir.</summary>
    public enum ErrorSource
    {
        /// <summary>Bir HTTP istegi sirasinda (yakalanmamis exception, yutulan exception ya da ciplak 5xx).</summary>
        Api = 0,

        /// <summary>Arka plan isleri (mail, saklama budamasi, dogum gunu).</summary>
        Job = 1,

        /// <summary>AI bot motoru.</summary>
        Bot = 2
    }

    public enum ErrorGroupStatus
    {
        Open = 0,

        /// <summary>Admin "cozuldu" dedi. Ayni hata tekrar gorulurse grup yeniden acilir ve bildirilir.</summary>
        Resolved = 1,

        /// <summary>Bilinen ve onemsenmeyen hata: sayac artar, bildirim gitmez, acik sayisina girmez.</summary>
        Ignored = 2
    }
}
