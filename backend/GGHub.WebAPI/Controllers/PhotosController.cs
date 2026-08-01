using GGHub.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class PhotosController : ControllerBase
{
    private readonly IPhotoService _photoService;

    public PhotosController(IPhotoService photoService)
    {
        _photoService = photoService;
    }

    [HttpPost("profile")]
    public async Task<IActionResult> UploadProfilePhoto(IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        try
        {
            var photoUrl = await _photoService.UploadProfilePhotoAsync(userId, file);
            return Ok(new { profileImageUrl = photoUrl });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("header")]
    public async Task<IActionResult> UploadHeaderPhoto(IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        try
        {
            var photoUrl = await _photoService.UploadHeaderPhotoAsync(userId, file);
            return Ok(new { headerImageUrl = photoUrl });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Gonderi gorseli. Istemci gorselleri TEK TEK yukler (en fazla 4) ve
    /// donen adresleri gonderi govdesinde yollar. Cok dosyali tek istek yerine
    /// bu secildi: mevcut tek dosyalik buildFormData yardimcilari bozulmuyor ve
    /// kullaniciya gorsel basina ilerleme gosterilebiliyor.
    ///
    /// RequestSizeLimit BILEREK acikca konuldu: servis zaten 5 MB'i reddediyor
    /// ama o kontrol dosya TAMAMEN alindiktan sonra calisiyor. Bu oznitelik
    /// istegi daha okunmadan kesiyor.
    /// </summary>
    [HttpPost("post")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadPostImage(IFormFile file)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        try
        {
            var result = await _photoService.UploadPostImageAsync(userId, file);
            return Ok(new { url = result.Url, width = result.Width, height = result.Height });
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("header")]
    public async Task<IActionResult> DeleteHeaderPhoto()
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        try
        {
            await _photoService.DeleteHeaderPhotoAsync(userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
