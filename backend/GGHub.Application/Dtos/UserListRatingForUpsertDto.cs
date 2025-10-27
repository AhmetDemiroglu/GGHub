using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListRatingForUpsertDto
    {
        [Required(ErrorMessage = "Puan değeri zorunludur.")]
        [Range(1, 5, ErrorMessage = "Puan 1 ile 5 arasında olmalıdır.")]
        public int Value { get; set; }
    }
}
