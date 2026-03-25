using GGHub.Application.Localization;
using GGHub.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListForCreationDto
    {
        [Required(ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.ListNameRequired))]
        [StringLength(100, MinimumLength = 3, ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.ListNameLength))]
        public string Name { get; set; }

        [StringLength(500, ErrorMessageResourceType = typeof(AppValidationText), ErrorMessageResourceName = nameof(AppValidationText.ListDescriptionLength))]
        public string? Description { get; set; }

        public ListVisibilitySetting Visibility { get; set; } = ListVisibilitySetting.Private;
        public ListCategory Category { get; set; } = ListCategory.Other;
    }
}
