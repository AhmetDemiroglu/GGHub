using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class BanUserRequestDto
    {
        [Required]
        [MinLength(10)]
        public string Reason { get; set; }
    }
}