using Microsoft.AspNetCore.Http;

namespace GGHub.Application.Interfaces
{
    /// <summary>
    /// Gonderi gorseli yuklemesinin sonucu. Boyutlar doniyor cunku akista
    /// gorsel inmeden once dogru oranli yer tutucu cizilmezse kart yuklendikce
    /// ziplar (layout shift).
    /// </summary>
    public class PostImageUploadResult
    {
        public string Url { get; set; } = string.Empty;
        public int Width { get; set; }
        public int Height { get; set; }
    }

    public interface IPhotoService
    {
        Task<string> UploadProfilePhotoAsync(int userId, IFormFile file);
        Task<string> UploadHeaderPhotoAsync(int userId, IFormFile file);
        Task DeleteHeaderPhotoAsync(int userId);

        /// <summary>
        /// Gonderi gorseli. Diger metotlardan farki: sonucu bir User kolonuna
        /// atamaz, yalnizca adresi ve boyutlari doner.
        /// </summary>
        Task<PostImageUploadResult> UploadPostImageAsync(int userId, IFormFile file);
    }
}
