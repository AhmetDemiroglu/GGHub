using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class AddGameToListDto
    {
        [Required]
        public int GameId { get; set; }
    }
}
