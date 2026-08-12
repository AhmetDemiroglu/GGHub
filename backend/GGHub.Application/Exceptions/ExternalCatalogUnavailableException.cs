namespace GGHub.Application.Exceptions
{
    /// <summary>
    /// Oyun yerel DB'de yok VE dis katalog saglayicisina (RAWG) su an ulasilamiyor.
    /// 404'ten bilinçli olarak ayrıdır: 404 "kayıt yok" demektir, bu ise "şu an bilinemiyor".
    /// WebAPI katmanında 503 + code=catalog_unavailable olarak dışarı çıkar; istemciler
    /// bunu "geçici, tekrar dene" olarak yorumlar.
    /// </summary>
    public class ExternalCatalogUnavailableException : Exception
    {
        public ExternalCatalogUnavailableException(string message, Exception? innerException = null)
            : base(message, innerException)
        {
        }
    }
}
