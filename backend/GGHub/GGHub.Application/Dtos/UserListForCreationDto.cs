namespace GGHub.Application.Dtos
{
    public class UserListForCreationDto
    {
        public string Name { get; set; }
        public string? Description { get; set; }
        public bool IsPublic { get; set; } = false;
    }
}