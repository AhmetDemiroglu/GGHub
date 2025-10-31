using Amazon.S3;
using Amazon.S3.Model;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace GGHub.Infrastructure.Services
{
    public class PhotoService : IPhotoService
    {
        private readonly GGHubDbContext _context;
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;
        private readonly string _cdnUrl;

        public PhotoService(
            GGHubDbContext context,
            IAmazonS3 s3Client,
            IConfiguration configuration)
        {
            _context = context;
            _s3Client = s3Client;
            _bucketName = configuration["R2:BucketName"]
                ?? throw new ArgumentNullException("R2:BucketName configuration is missing");

            var accountId = configuration["R2:AccountId"]
                ?? throw new ArgumentNullException("R2:AccountId configuration is missing");

            _cdnUrl = $"https://{accountId}.r2.cloudflarestorage.com/{_bucketName}";
        }

        public async Task<string> UploadProfilePhotoAsync(int userId, IFormFile file)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new KeyNotFoundException("Kullanıcı bulunamadı.");

            if (file == null || file.Length == 0)
                throw new ArgumentException("Dosya boş olamaz.");

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Geçersiz dosya formatı. Sadece JPG, PNG, GIF, WEBP desteklenir.");

            if (file.Length > 5 * 1024 * 1024)
                throw new ArgumentException("Dosya boyutu 5MB'dan büyük olamaz.");

            var fileName = $"profile-{userId}-{Guid.NewGuid()}{extension}";

            using (var stream = file.OpenReadStream())
            {
                var putRequest = new PutObjectRequest
                {
                    BucketName = _bucketName,
                    Key = fileName,
                    InputStream = stream,
                    ContentType = file.ContentType,
                    CannedACL = S3CannedACL.PublicRead
                };

                await _s3Client.PutObjectAsync(putRequest);
            }

            var fileUrl = $"{_cdnUrl}/{fileName}";

            user.ProfileImageUrl = fileUrl;
            await _context.SaveChangesAsync();

            return fileUrl;
        }
    }
}