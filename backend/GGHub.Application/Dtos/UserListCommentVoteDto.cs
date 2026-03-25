using GGHub.Application.Localization;
using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListCommentVoteDto
    {
        [Required(ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.VoteValueRequired))]
        [Range(-1, 1, ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.VoteValueRange))]
        public int Value { get; set; }
    }
}
