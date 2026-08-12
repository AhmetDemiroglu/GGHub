using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IAgendaService
    {
        /// <summary>Verilen yil+ayin gundemini dondurur. Sonuc memory-cache'lidir (30 dk).</summary>
        Task<AgendaViewModel> GetAgendaAsync(int year, int month);
    }
}
