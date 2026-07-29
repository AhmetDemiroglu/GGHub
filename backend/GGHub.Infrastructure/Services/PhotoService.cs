using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using GGHub.Application.Interfaces;
using GGHub.Infrastructure.Localization;
using GGHub.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;


namespace GGHub.Infrastructure.Services
{
    public class PhotoService : IPhotoService
    {
        // Yüklenen görsel sunucuda küçültülür. Öncesinde orijinal dosya byte-byte R2'ye
        // kopyalanıyordu: telefondan çekilmiş bir fotoğrafın kırpılmışı 600 KB+ JPEG olarak
        // gidiyor, ana sayfada 28-48 px'lik avatar dairesine basılıyordu (Lighthouse'ta tek
        // sayfada ~1.7 MB avatar). İstemci tarafı da kısıtlandı ama bu sunucu tarafı tavan,
        // eski mobil sürümler ve gelecekteki istemciler için güvenlik ağı.
        private const int ProfileMaxEdge = 512;
        private const int HeaderMaxEdge = 1600;
        private const int WebpQuality = 82;

        // Key'ler GUID içerdiği için içerik hiç değişmez; bir yıl immutable cache güvenli.
        // Bu başlık olmadığında Cloudflare kendi varsayılanına (4 saat) düşüyordu.
        private const string AssetCacheControl = "public, max-age=31536000, immutable";

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
                ?? throw new ArgumentNullException(AppText.Get("photo.bucketConfigMissing"));

            _publicR2Url = configuration["R2:PublicUrl"]
                ?? throw new ArgumentNullException(AppText.Get("photo.publicUrlConfigMissing"));
        }

        public Task<string> UploadProfilePhotoAsync(int userId, IFormFile file) =>
            UploadAndAssignAsync(userId, file, "profiles", ProfileMaxEdge, (user, url) => user.ProfileImageUrl = url);

        public Task<string> UploadHeaderPhotoAsync(int userId, IFormFile file) =>
            UploadAndAssignAsync(userId, file, "headers", HeaderMaxEdge, (user, url) => user.HeaderImageUrl = url);

        public async Task DeleteHeaderPhotoAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new KeyNotFoundException(AppText.Get("photo.userNotFound"));

            user.HeaderImageUrl = null;
            await _context.SaveChangesAsync();
        }

        private async Task<string> UploadAndAssignAsync(
            int userId,
            IFormFile file,
            string keyPrefix,
            int maxEdge,
            Action<Core.Entities.User, string> assign)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                throw new KeyNotFoundException(AppText.Get("photo.userNotFound"));

            if (file == null || file.Length == 0)
                throw new ArgumentException(AppText.Get("photo.fileEmpty"));

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
                throw new ArgumentException(AppText.Get("photo.invalidFormat", new Dictionary<string, object?> { ["extension"] = extension }));

            if (file.Length > 5 * 1024 * 1024)
                throw new ArgumentException(AppText.Get("photo.fileTooLarge"));

            // Çıktı her zaman WebP: uzantıyı girdi dosyasından değil dönüştürmenin sonucundan al.
            var fileName = $"{keyPrefix}/{userId}-{Guid.NewGuid()}.webp";
            var transferUtility = new TransferUtility(_s3Client);

            using (var uploadStream = await NormalizeAsync(file, maxEdge))
            {
                var uploadRequest = new TransferUtilityUploadRequest
                {
                    BucketName = _bucketName,
                    Key = fileName,
                    InputStream = uploadStream,
                    ContentType = "image/webp",
                    CannedACL = S3CannedACL.PublicRead,
                    DisablePayloadSigning = true,
                    DisableDefaultChecksumValidation = true
                };

                uploadRequest.Headers.CacheControl = AssetCacheControl;

                await transferUtility.UploadAsync(uploadRequest);
            }

            var fileUrl = $"{_publicR2Url}/{fileName}";
            assign(user, fileUrl);
            await _context.SaveChangesAsync();

            return fileUrl;
        }

        /// <summary>
        /// Görseli uzun kenarı <paramref name="maxEdge"/> pikseli aşmayacak şekilde küçültüp
        /// WebP'e çevirir. Küçültme yalnızca gerektiğinde yapılır (küçük görsel büyütülmez).
        /// EXIF yönlendirmesi uygulanır ve metadata düşer, böylece konum bilgisi de sızmaz.
        /// </summary>
        private static async Task<Stream> NormalizeAsync(IFormFile file, int maxEdge)
        {
            await using var source = file.OpenReadStream();

            Image image;
            try
            {
                image = await Image.LoadAsync(source);
            }
            catch (Exception ex) when (ex is UnknownImageFormatException or InvalidImageContentException)
            {
                // Uzantısı doğru ama içeriği görsel olmayan dosya.
                throw new ArgumentException(AppText.Get("photo.invalidFormat", new Dictionary<string, object?> { ["extension"] = Path.GetExtension(file.FileName) }));
            }

            using (image)
            {
                image.Mutate(ctx =>
                {
                    ctx.AutoOrient();

                    if (image.Width > maxEdge || image.Height > maxEdge)
                    {
                        ctx.Resize(new ResizeOptions
                        {
                            Size = new Size(maxEdge, maxEdge),
                            Mode = ResizeMode.Max,
                            Sampler = KnownResamplers.Lanczos3
                        });
                    }
                });

                image.Metadata.ExifProfile = null;
                image.Metadata.IptcProfile = null;
                image.Metadata.XmpProfile = null;

                var output = new MemoryStream();
                await image.SaveAsync(output, new WebpEncoder { Quality = WebpQuality });
                output.Position = 0;
                return output;
            }
        }
    }
}
