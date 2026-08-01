namespace GGHub.Core.Entities
{
    /// <summary>
    /// Gonderiye ekli gorsel. Gonderi basina en fazla 4 (PostService dogrular).
    /// Url, R2'ye yuklenmis WebP dosyasinin tam adresi; seed iceriginde mevcut
    /// RAWG kapak adresleri kullanildigi icin R2'ye hic dosya yazilmaz.
    /// </summary>
    public class PostImage
    {
        public int Id { get; set; }

        public int PostId { get; set; }
        public Post Post { get; set; }

        public string Url { get; set; } = string.Empty;

        /// <summary>Istemci yer tutucu oranini kayma olmadan cizsin diye saklanir.</summary>
        public int? Width { get; set; }
        public int? Height { get; set; }

        /// <summary>0-3 arasi gosterim sirasi.</summary>
        public int Position { get; set; }
    }
}
