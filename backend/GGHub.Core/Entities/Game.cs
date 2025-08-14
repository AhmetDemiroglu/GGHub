using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Core.Entities
{
    public class Game
    {
        public int Id { get; set; }
        public int RawgId { get; set; }
        public string Slug { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Released { get; set; }
        public string? BackgroundImage { get; set; }
        public double? Rating { get; set; }
        public int? Metacritic { get; set; }
        public string? Description { get; set; }
        public string? CoverImage { get; set; }
        public DateTime LastSyncedAt { get; set; }
    }
}