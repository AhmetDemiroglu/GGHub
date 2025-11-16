namespace GGHub.Application.Dtos
{
    public class TopListDto
    {
        public int ListId { get; set; }
        public string ListName { get; set; }
        public string OwnerUsername { get; set; } 
        public int FollowerCount { get; set; }
    }
}