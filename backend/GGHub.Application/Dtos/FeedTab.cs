namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Akis sekmesi. Eski ?type= parametresinden AYRI tutuluyor:
    /// mağazadaki iOS 1.0.5 / Android 1.0.7 surumleri hala ?type=0|1|2
    /// gonderiyor ve o yol aynen calismaya devam ediyor. Yeni istemciler
    /// ?tab= kullanir.
    /// </summary>
    public enum FeedTab
    {
        Posts = 0,
        Reviews = 1,
        Discover = 2
    }
}
