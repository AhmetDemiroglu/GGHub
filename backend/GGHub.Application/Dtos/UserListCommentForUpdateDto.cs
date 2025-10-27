using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class UserListCommentForUpdateDto
    {
        [Required(ErrorMessage = "Yorum içeriği boş olamaz.")]
        [StringLength(1000, MinimumLength = 1, ErrorMessage = "Yorum 1 ila 1000 karakter arasında olmalıdır.")]
        public string Content { get; set; }
    }
}