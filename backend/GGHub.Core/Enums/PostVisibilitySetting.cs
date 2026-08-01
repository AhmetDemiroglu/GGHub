namespace GGHub.Core.Enums
{
    /// <summary>
    /// "Gonderilerimi kimler gorebilir" ayari. Kullanici PROFILINDE tutulur,
    /// gonderide DEGIL: ayar canli uygulanir, degistirildigi anda gecmis
    /// gonderiler de etkilenir (ProfileVisibility ile ayni davranis).
    ///
    /// Sayisal degerler ACIK yazildi: istemci enum'lari (web + mobil) bu
    /// degerleri aynaliyor ve ProfileVisibilitySetting'in degersiz birakilmis
    /// olmasi bir daha tekrarlanmamali.
    /// </summary>
    public enum PostVisibilitySetting
    {
        Everyone = 0,
        Followers = 1,
        Private = 2
    }
}
