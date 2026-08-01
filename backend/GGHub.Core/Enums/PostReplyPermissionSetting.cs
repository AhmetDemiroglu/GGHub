namespace GGHub.Core.Enums
{
    /// <summary>
    /// "Gonderilerime kimler yanit verebilir" ayari.
    ///
    /// Followers : beni takip edenler yanitlayabilir
    /// Following : benim takip ettiklerim yanitlayabilir
    ///
    /// Ikisi ayri yonler; MessagePrivacySetting.Following ile ayni ismi
    /// tasisa da orada kural "alici gondereni takip ediyor mu" seklinde
    /// isliyor. Karistirmamak icin PostAccess.CanReply iki yonu de ayri
    /// parametre olarak aliyor.
    /// </summary>
    public enum PostReplyPermissionSetting
    {
        Everyone = 0,
        Followers = 1,
        Following = 2,
        Nobody = 3
    }
}
