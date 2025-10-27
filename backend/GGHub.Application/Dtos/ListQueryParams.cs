using GGHub.Core.Enums;
using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class ListQueryParams
    {
        private const int MaxPageSize = 50;

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        private int _pageSize = 12;

        [Range(1, MaxPageSize)]
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = (value > MaxPageSize) ? MaxPageSize : value;
        }
        public string? SearchTerm { get; set; }

        public ListCategory? Category { get; set; }
    }
}
