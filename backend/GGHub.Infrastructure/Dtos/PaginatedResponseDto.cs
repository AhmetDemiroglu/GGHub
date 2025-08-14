using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json.Serialization;

namespace GGHub.Infrastructure.Dtos
{
    public class PaginatedResponseDto<T>
    {
        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonPropertyName("next")]
        public string? Next { get; set; }

        [JsonPropertyName("results")]
        public IEnumerable<T> Results { get; set; } = Enumerable.Empty<T>();
    }
}
