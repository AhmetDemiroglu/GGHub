namespace GGHub.Application.Dtos
{
    /// <summary>Silinmis hesaplarda hala duran icerik. Hepsi 0 ise temizlenecek bir sey yok.</summary>
    public class DeletedAccountResidueDto
    {
        /// <summary>Icerigi kalmis silinmis hesap sayisi.</summary>
        public int Accounts { get; set; }
        public int Reviews { get; set; }
        public int Comments { get; set; }
        public int Lists { get; set; }
        public int Posts { get; set; }
        public int Likes { get; set; }
        public int Follows { get; set; }
        public int RankingEntries { get; set; }
    }
}
