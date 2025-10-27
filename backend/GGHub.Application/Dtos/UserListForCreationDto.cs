using GGHub.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListForCreationDto
    {
        [Required(ErrorMessage = "Liste adı zorunludur.")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "Liste adı 3 ila 100 karakter arasında olmalıdır.")]
        public string Name { get; set; }

        [StringLength(500, ErrorMessage = "Açıklama en fazla 500 karakter olabilir.")]
        public string? Description { get; set; }

        public ListVisibilitySetting Visibility { get; set; } = ListVisibilitySetting.Private;
        public ListCategory Category { get; set; } = ListCategory.Other;
    }
}