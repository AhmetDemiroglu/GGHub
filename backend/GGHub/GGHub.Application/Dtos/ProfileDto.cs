﻿namespace GGHub.Application.Dtos
{
    public class ProfileDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Bio { get; set; }
        public string? ProfileImageUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Status { get; set; }
        public string? PhoneNumber { get; set; }

    }
}
