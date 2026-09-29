using GGHub.Application.Dtos;

namespace GGHub.Application.Interfaces
{
    public interface IAgendaService
    {
        /// <summary>Verilen yil+ayin gundemini dondurur. Sonuc memory-cache'lidir (30 dk).</summary>
        Task<AgendaViewModel> GetAgendaAsync(int year, int month);

        /// <summary>
        /// Gundemde ada gore arama. Kapsam ay degil, gundemin gezilebildigi butun araliktir
        /// (gecen yilin basindan ileriye + tarihi aciklanmamis oyunlar); sonuc hype sirasiyla
        /// gelir, en fazla 24 oyun.
        /// </summary>
        Task<List<GameDto>> SearchAsync(string term);
    }
}
