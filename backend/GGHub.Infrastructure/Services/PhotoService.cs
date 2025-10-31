using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
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

        private readonly string _publicR2Url;

        public PhotoService(
            GGHubDbContext context,
            IAmazonS3 s3Client,
            IConfiguration configuration)
        {
            _context = context;
            _s3Client = s3Client;

            _bucketName = configuration["R2:BucketName"]
                ?? throw new ArgumentNullException("R2:BucketName configuration is missing");

            _publicR2Url = configuration["R2:PublicUrl"]
                ?? throw new ArgumentNullException("R2:PublicUrl configuration is missing");
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

            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
                throw new ArgumentException($"Geçersiz dosya formatı. Gelen format: '{extension}'. Sadece JPG, PNG, GIF, WEBP desteklenir.");

            if (file.Length > 5 * 1024 * 1024) 
                throw new ArgumentException("Dosya boyutu 5MB'dan büyük olamaz.");

            var fileName = $"profiles/{userId}-{Guid.NewGuid()}{extension}";
            var transferUtility = new TransferUtility(_s3Client);

            using (var memoryStream = new MemoryStream())
            {
                await file.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                var uploadRequest = new TransferUtilityUploadRequest
                {
                    BucketName = _bucketName,
                    Key = fileName,
                    InputStream = memoryStream,
                    ContentType = file.ContentType,
                    CannedACL = S3CannedACL.PublicRead,
                    DisablePayloadSigning = true,
                    DisableDefaultChecksumValidation = true
                };

                await transferUtility.UploadAsync(uploadRequest);
            }
            var fileUrl = $"{_publicR2Url}/{fileName}";

            user.ProfileImageUrl = fileUrl;
            await _context.SaveChangesAsync();

            return fileUrl;
        }
    }
}