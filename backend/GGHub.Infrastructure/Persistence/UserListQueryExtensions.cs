using GGHub.Core.Entities;

namespace GGHub.Infrastructure.Persistence
{
    /// <summary>
    /// Liste sorgularinin sahip suzgeci. Hesap silme (ProfileService.AnonymizeUserAsync) kullaniciyi
    /// yalnizca anonimlestirir, listeleri DB'de kalir; bu suzgec olmadan "deleted_user_12" sahibiyle
    /// kesifte, aramada ve dogrudan linkte gorunmeye devam ediyordu.
    ///
    /// Kullanici adiyla calisan uclar (GetListsByUsernameAsync, favoriler) bunu kullanmaz:
    /// ProfileContentAccess.GetViewableUserAsync silinmis sahibi zaten eler.
    /// </summary>
    public static class UserListQueryExtensions
    {
        /// <summary>Sahibi silinmis ya da banlanmis listeleri eler.</summary>
        public static IQueryable<UserList> WhereOwnerActive(this IQueryable<UserList> lists)
        {
            return lists.Where(l => !l.User.IsDeleted && !l.User.IsBanned);
        }
    }
}
