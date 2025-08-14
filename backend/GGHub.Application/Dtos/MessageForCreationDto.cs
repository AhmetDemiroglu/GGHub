using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class MessageForCreationDto
    {
        [Required]
        public string RecipientUsername { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Content { get; set; }
    }
}