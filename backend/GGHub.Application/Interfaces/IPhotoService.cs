using Microsoft.AspNetCore.Http;

namespace GGHub.Application.Interfaces
{
    public interface IPhotoService
    {
        Task<string> UploadProfilePhotoAsync(int userId, IFormFile file);
    }
}