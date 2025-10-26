﻿using System.ComponentModel.DataAnnotations;

namespace GGHub.Application.Dtos
{
    public class NotificationDto
    {
        public int Id { get; set; }
        public string Message { get; set; }
        public string? Link { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}