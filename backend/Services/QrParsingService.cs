using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Backend.Services
{
    public class QrParsingService : IQrParsingService
    {
        public QrParseResult ParseQr(string qr, Dictionary<string, string> config)
        {
            if (string.IsNullOrWhiteSpace(qr))
            {
                return new QrParseResult { IsValid = false, ErrorMessage = "QR vacío" };
            }

            // Normalize QR (strip spaces and newlines)
            qr = qr.Trim().Replace("\r", "").Replace("\n", "");

            string parseType = config.GetValueOrDefault("Qr_Parse_Type", "Separator");
            string datetimeFormat = config.GetValueOrDefault("Qr_Datetime_Format", "yyyyMMddHHmm");

            string rawOrnament = "";
            string rawDatetime = "";
            string rawSerial = "";

            try
            {
                if (parseType.Equals("Position", StringComparison.OrdinalIgnoreCase))
                {
                    // Position-based parsing
                    int ornIdx = int.Parse(config.GetValueOrDefault("Qr_Pos_Ornament_Index", "0"));
                    int ornLen = int.Parse(config.GetValueOrDefault("Qr_Pos_Ornament_Length", "11"));
                    int dateIdx = int.Parse(config.GetValueOrDefault("Qr_Pos_Date_Index", "11"));
                    int dateLen = int.Parse(config.GetValueOrDefault("Qr_Pos_Date_Length", "12"));
                    int serialIdx = int.Parse(config.GetValueOrDefault("Qr_Pos_Serial_Index", "23"));
                    int serialLen = int.Parse(config.GetValueOrDefault("Qr_Pos_Serial_Length", "10"));

                    if (qr.Length < ornIdx + ornLen)
                        return new QrParseResult { IsValid = false, ErrorMessage = $"QR muy corto para extraer ornamento en posición {ornIdx} (largo {ornLen})" };
                    rawOrnament = qr.Substring(ornIdx, ornLen);

                    if (qr.Length >= dateIdx + dateLen)
                        rawDatetime = qr.Substring(dateIdx, dateLen);

                    if (qr.Length >= serialIdx + serialLen)
                        rawSerial = qr.Substring(serialIdx, serialLen);
                }
                else if (parseType.Equals("Regex", StringComparison.OrdinalIgnoreCase))
                {
                    // Regex-based parsing
                    string pattern = config.GetValueOrDefault("Qr_Regex_Pattern", @"^(?<ornament>[^;]+);(?<datetime>\d{12});(?<serial>[^;]+)$");
                    var regex = new Regex(pattern);
                    var match = regex.Match(qr);

                    if (!match.Success)
                    {
                        return new QrParseResult { IsValid = false, ErrorMessage = "El QR no coincide con la expresión regular configurada" };
                    }

                    rawOrnament = match.Groups["ornament"]?.Value ?? "";
                    rawDatetime = match.Groups["datetime"]?.Value ?? "";
                    rawSerial = match.Groups["serial"]?.Value ?? "";
                }
                else
                {
                    // Separator-based parsing (default)
                    string sep = config.GetValueOrDefault("Qr_Separator", ";");
                    if (string.IsNullOrEmpty(sep)) sep = ";";

                    string[] tokens = qr.Split(new[] { sep }, StringSplitOptions.None);

                    int ornIdx = int.Parse(config.GetValueOrDefault("Qr_Pos_Ornament_Index", "0"));
                    int dateIdx = int.Parse(config.GetValueOrDefault("Qr_Pos_Date_Index", "1"));
                    int serialIdx = int.Parse(config.GetValueOrDefault("Qr_Pos_Serial_Index", "2"));

                    if (ornIdx < 0 || ornIdx >= tokens.Length)
                        return new QrParseResult { IsValid = false, ErrorMessage = $"Índice de ornamento {ornIdx} fuera de rango. Tokens encontrados: {tokens.Length}" };
                    rawOrnament = tokens[ornIdx];

                    if (dateIdx >= 0 && dateIdx < tokens.Length)
                        rawDatetime = tokens[dateIdx];

                    if (serialIdx >= 0 && serialIdx < tokens.Length)
                        rawSerial = tokens[serialIdx];
                }

                // Process Ornament Code normalization
                rawOrnament = rawOrnament.Trim().ToUpper();
                if (string.IsNullOrEmpty(rawOrnament))
                {
                    return new QrParseResult { IsValid = false, ErrorMessage = "Código de ornamento vacío después de parsear" };
                }

                // Parse DateTime
                DateTime? cureStartTime = ParseDateTime(rawDatetime, datetimeFormat);
                if (cureStartTime == null && !string.IsNullOrEmpty(rawDatetime))
                {
                    return new QrParseResult { IsValid = false, ErrorMessage = $"Fecha de curado inválida o formato incorrecto: '{rawDatetime}' (esperado: {datetimeFormat})" };
                }

                return new QrParseResult
                {
                    IsValid = true,
                    OrnamentCode = rawOrnament,
                    CureStartTime = cureStartTime,
                    SerialNumber = string.IsNullOrEmpty(rawSerial) ? null : rawSerial.Trim(),
                    // Seed some default details
                    Lot = "LOT-" + DateTime.Now.ToString("yyyyMMdd"),
                    Model = "MODEL-A",
                    Hand = rawOrnament.EndsWith("0") ? "L" : "R",
                    Position = "F"
                };
            }
            catch (Exception ex)
            {
                return new QrParseResult
                {
                    IsValid = false,
                    ErrorMessage = $"Error técnico al parsear QR: {ex.Message}"
                };
            }
        }

        private DateTime? ParseDateTime(string rawValue, string format)
        {
            if (string.IsNullOrWhiteSpace(rawValue)) return null;

            rawValue = rawValue.Trim();

            // Unix timestamp handling
            if (format.Equals("Unix", StringComparison.OrdinalIgnoreCase) || format.Equals("UnixTimestamp", StringComparison.OrdinalIgnoreCase))
            {
                if (long.TryParse(rawValue, out long timestamp))
                {
                    // Soport seconds or milliseconds
                    if (rawValue.Length > 10) // milliseconds
                    {
                        return DateTimeOffset.FromUnixTimeMilliseconds(timestamp).DateTime;
                    }
                    else // seconds
                    {
                        return DateTimeOffset.FromUnixTimeSeconds(timestamp).DateTime;
                    }
                }
                return null;
            }

            // Normal formats (e.g. yyyyMMddHHmm, yyyyMMddHHmmss, ddMMyyyyHHmm, yyMMddHHmm)
            // Support multiple standard formats if the user specifies it
            string[] formats = new[] { format, "yyyyMMddHHmm", "yyyyMMddHHmmss", "ddMMyyyyHHmm", "yyMMddHHmm" };
            if (DateTime.TryParseExact(rawValue, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime dt))
            {
                return dt;
            }

            return null;
        }
    }
}
