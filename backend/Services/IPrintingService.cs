using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    public class PrintJobResult
    {
        public bool Success { get; set; }
        public string PrinterUsed { get; set; } = string.Empty;
        public string? Base64LabelPreview { get; set; }
        public string? SavedFilePath { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public interface IPrintingService
    {
        IEnumerable<string> GetInstalledPrinters();
        Task<PrintJobResult> PrintKanbanAsync(Validacion validation, Dictionary<string, string> config);
        Task<string> GeneratePreviewAsync(string zplTemplate, Validacion validation, double? widthInches = null, double? heightInches = null, int? dpi = null);
    }
}
