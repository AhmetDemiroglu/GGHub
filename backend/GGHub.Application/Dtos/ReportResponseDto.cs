using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos.Admin
{
    public class ReportResponseDto
    {
        [Required]
        public string Response { get; set; }
    }
}