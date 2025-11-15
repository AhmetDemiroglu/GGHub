using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class ChangeRoleRequestDto
    {
        [Required]
        public string NewRole { get; set; }
    }
}