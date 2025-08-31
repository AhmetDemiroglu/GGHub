using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace GGHub.Infrastructure.Services
{
    public class PhotoService : IPhotoService
    {
        private readonly GGHubDbContext _context;
        private readonly IWebHostEnvironment _hostEnvironment;

        public PhotoService(GGHubDbContext context, IWebHostEnvironment hostEnvironment)
        {
            _context = context;
            _hostEnvironment = hostEnvironment;
        }

        public async Task<string> UploadProfilePhotoAsync(int userId, IFormFile file)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException("Kullanıcı bulunamadı.");

            if (file == null || file.Length == 0) throw new ArgumentException("Dosya boş olamaz.");

            var uploadPath = Path.Combine(_hostEnvironment.WebRootPath, "images", "profiles");
            if (!Directory.Exists(uploadPath))
            {
                Directory.CreateDirectory(uploadPath);
            }

            var extension = Path.GetExtension(file.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/images/profiles/{fileName}";

            user.ProfileImageUrl = fileUrl;
            await _context.SaveChangesAsync();

            return fileUrl;
        }
    }
}