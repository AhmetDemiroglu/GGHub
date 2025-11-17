using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class AdminCommentSummaryDto
    {
        public int Id { get; set; }
        public string ListName { get; set; }
        public int ListId { get; set; }
        public string ContentPreview { get; set; } 
        public string FullContent { get; set; }
        public ListVisibilitySetting Visibility { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}