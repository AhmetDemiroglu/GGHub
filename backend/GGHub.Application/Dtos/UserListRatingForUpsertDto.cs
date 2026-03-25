using GGHub.Application.Localization;
using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListRatingForUpsertDto
    {
        [Required(ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.RatingValueRequired))]
        [Range(1, 5, ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.RatingValueRange))]
        public int Value { get; set; }
    }
}
