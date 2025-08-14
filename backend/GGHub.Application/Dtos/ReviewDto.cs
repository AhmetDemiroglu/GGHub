namespace GGHub.Application.Dtos
{
    public class ReviewDto
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public int Rating { get; set; }
        public DateTime CreatedAt { get; set; }
        public UserDto User { get; set; } // Tam User entity'si yerine güvenli UserDto'yu kullanıyoruz.
    }
}