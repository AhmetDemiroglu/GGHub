using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GGHub.Application.Interfaces
{
    public interface IGeminiService
    {
        Task<string> TranslateHtmlDescriptionAsync(string englishText);
    }
}