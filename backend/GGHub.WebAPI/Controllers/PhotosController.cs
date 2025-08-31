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
}