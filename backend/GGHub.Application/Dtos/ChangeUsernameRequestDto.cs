using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class ChangeUsernameRequestDto
    {
        [Required]
        public string Username { get; set; }
    }
}
