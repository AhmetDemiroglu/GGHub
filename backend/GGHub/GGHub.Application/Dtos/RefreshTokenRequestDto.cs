using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class RefreshTokenRequestDto
    {
        [Required]
        public string RefreshToken { get; set; }
    }
}