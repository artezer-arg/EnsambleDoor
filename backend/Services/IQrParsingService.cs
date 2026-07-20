using System;
using System.Collections.Generic;

namespace Backend.Services
{
    public class QrParseResult
    {
        public bool IsValid { get; set; }
        public string? OrnamentCode { get; set; }
        public DateTime? CureStartTime { get; set; }
        public string? SerialNumber { get; set; }
        public string? Lot { get; set; }
        public string? Model { get; set; }
        public string? Hand { get; set; }
        public string? Position { get; set; }
        public string? Vendor { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public interface IQrParsingService
    {
        QrParseResult ParseQr(string qr, Dictionary<string, string> config);
    }
}
