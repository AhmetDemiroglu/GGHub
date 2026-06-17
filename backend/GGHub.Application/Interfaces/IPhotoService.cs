using Microsoft.AspNetCore.Http;

namespace GGHub.Application.Interfaces
{
    public interface IPhotoService
    {
        Task<string> UploadProfilePhotoAsync(int userId, IFormFile file);
        Task<string> UploadHeaderPhotoAsync(int userId, IFormFile file);
        Task DeleteHeaderPhotoAsync(int userId);
    }
}
