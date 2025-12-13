namespace GGHub.Core.Entities
{
    public class Achievement
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public int XpReward { get; set; }
        public string CriteriaJson { get; set; }
        public bool IsActive { get; set; } = true;
    }
}