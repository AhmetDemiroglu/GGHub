using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    public class UpdatePostVisibilityDto
    {
        public PostVisibilitySetting NewVisibility { get; set; }
    }

    public class UpdatePostReplyPermissionDto
    {
        public PostReplyPermissionSetting NewPermission { get; set; }
    }
}
