using GGHub.Core.Enums;

namespace GGHub.Application.Dtos
{
    /// <summary>
    /// Composer'daki "@" acilir listesinin tek satiri. Uc hedef tipi ayni listede
    /// karisik doner, istemci Type'a gore ikon ve renk secer.
    ///
    /// Id + Type ikilisi token'a yaziliyor ("@[g:456]"); Display yalnizca
    /// gosterim icin, token'a GOMULMUYOR.
    /// </summary>
    public class MentionSuggestionDto
    {
        public MentionTargetType Type { get; set; }
        public int Id { get; set; }

        /// <summary>Kullanici adi / oyun adi / liste adi.</summary>
        public string Display { get; set; } = string.Empty;

        /// <summary>Kisi icin avatar, oyun icin kapak, liste icin null.</summary>
        public string? ImageUrl { get; set; }

        /// <summary>Ikincil satir: oyun icin cikis yili, liste icin sahibinin adi, kisi icin ad soyad.</summary>
        public string? Subtitle { get; set; }
    }
}
