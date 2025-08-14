using GGHub.Application.Dtos;

public class UserDataExportDto
{
    public ProfileDto Profile { get; set; }
    public IEnumerable<ReviewDto> Reviews { get; set; }
    public IEnumerable<UserListDetailDto> Lists { get; set; }
    public IEnumerable<MessageDto> Messages { get; set; }
}