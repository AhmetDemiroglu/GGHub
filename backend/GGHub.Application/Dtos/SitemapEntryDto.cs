namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Sitemap icin tek bir URL girdisi. Key turune gore oyun slug'i, liste id'si ya da
    /// kullanici adidir; URL'i Next.js kurar (dil oneki, sema). LastModified sitemap
    /// "lastmod" alanina gider; her istekte "simdi" yazmak Google icin anlamsiz sinyaldi.
    /// </summary>
    public class SitemapEntryDto
    {
        public string Key { get; set; } = string.Empty;
        public DateTime LastModified { get; set; }
    }
}
