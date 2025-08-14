using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class ReportForCreationDto
    {
        [Required]
        [MaxLength(500)]
        public string Reason { get; set; }
    }
}