using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Application.Dtos
{
    public class UserListCommentVoteDto
    {
        [Required(ErrorMessage = "Oy değeri zorunludur.")]
        [Range(-1, 1, ErrorMessage = "Oy değeri 1 (upvote) veya -1 (downvote) olmalıdır. 0 geçerli değildir.")]
        public int Value { get; set; }
    }
}
