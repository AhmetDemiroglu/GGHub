using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class ReviewForCreationDto
    {
        [Required]
        public int GameId { get; set; }
        [Required]
        [Range(1, 10)]
        public int Rating { get; set; }
        [Required]
        public string Content { get; set; }
    }
}