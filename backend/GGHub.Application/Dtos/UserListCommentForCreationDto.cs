using GGHub.Application.Localization;
using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListCommentForCreationDto
    {
        [Required(ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.CommentContentRequired))]
        [StringLength(1000, MinimumLength = 1, ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.CommentContentLength))]
        public string Content { get; set; }

        public int? ParentCommentId { get; set; }
    }
}
