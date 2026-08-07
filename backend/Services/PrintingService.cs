using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Printing;
using System.IO;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Backend.Models;

namespace Backend.Services
{
    // Native Windows Spooler raw printing helper class
    public class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
        public class DOCINFOA
        {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName = "";
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile = "";
            [MarshalAs(UnmanagedType.LPStr)] public string pDataType = "";
        }

        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, CallingConvention = CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        public static bool SendStringToPrinter(string szPrinterName, string szString)
        {
            IntPtr hPrinter = IntPtr.Zero;
            DOCINFOA di = new DOCINFOA();
            bool bSuccess = false;

            di.pDocName = "Zebra ZPL Raw Print Job";
            di.pDataType = "RAW";

            if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero))
            {
                if (StartDocPrinter(hPrinter, 1, di))
                {
                    if (StartPagePrinter(hPrinter))
                    {
                        IntPtr pBytes = Marshal.StringToCoTaskMemAnsi(szString);
                        int dwCount = szString.Length;
                        int dwWritten = 0;
                        bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                        Marshal.FreeCoTaskMem(pBytes);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }
            return bSuccess;
        }
    }

    public class PrintingService : IPrintingService
    {
        private static bool _isLabelaryAvailable = true;
        private static DateTime _lastConnectionCheck = DateTime.MinValue;
        private static readonly object _checkLock = new object();
        public IEnumerable<string> GetInstalledPrinters()
        {
            var printers = new List<string>();
            try
            {
                foreach (string printer in PrinterSettings.InstalledPrinters)
                {
                    printers.Add(printer);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error enumerando impresoras: {ex.Message}");
            }
            return printers;
        }

        public async Task<PrintJobResult> PrintKanbanAsync(Validacion validation, Dictionary<string, string> config)
        {
            bool simulatorEnabled = bool.Parse(config.GetValueOrDefault("Printer_Simulator_Enabled", "true"));
            string printerMode = config.GetValueOrDefault("Printer_Mode", "Spooler"); // Spooler, NetworkRaw
            string printerName = config.GetValueOrDefault("Printer_Name", "Microsoft Print to PDF");
            string printerIp = config.GetValueOrDefault("Printer_IP", "192.168.1.100");
            int printerPort = int.Parse(config.GetValueOrDefault("Printer_Port", "9100"));
            string zplTemplate = config.GetValueOrDefault("Printer_Zpl_Template", "");
            int copies = int.Parse(config.GetValueOrDefault("Print_Copies", "1"));

            if (copies <= 0) copies = 1;

            var result = new PrintJobResult();

            try
            {
                // 1. Process ZPL template variable replacements
                string processedZpl = ReplaceZplPlaceholders(zplTemplate, validation);

                // 2. Generate the base64 preview (Hybrid preview: Labelary online -> C# GDI fallback offline)
                result.Base64LabelPreview = await GetLabelPreviewAsync(processedZpl, validation);

                // 3. Save simulation file if requested (for logging/development testing)
                string targetFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "PrintedLabels");
                Directory.CreateDirectory(targetFolder);
                string fileName = $"Kanban_{validation.ID_OrdenProduccion}_{DateTime.Now:yyyyMMddHHmmss}.png";
                string filePath = Path.Combine(targetFolder, fileName);
                
                // Decode base64 to save preview file
                byte[] previewBytes = Convert.FromBase64String(result.Base64LabelPreview);
                await File.WriteAllBytesAsync(filePath, previewBytes);
                result.SavedFilePath = filePath;

                if (!simulatorEnabled)
                {
                    if (printerMode.Equals("NetworkRaw", StringComparison.OrdinalIgnoreCase))
                    {
                        // Direct TCP raw socket printing to Zebra
                        var rawPayload = new StringBuilder();
                        for (int i = 0; i < copies; i++)
                        {
                            rawPayload.Append(processedZpl).Append("\n");
                        }
                        
                        await SendToNetworkZebraAsync(printerIp, printerPort, rawPayload.ToString());
                        result.PrinterUsed = $"Zebra IP ({printerIp}:{printerPort})";
                        result.Success = true;
                    }
                    else // Spooler mode (USB / Windows Driver)
                    {
                        // Check if printer selected is a Zebra (or Generic/Text Only) to use ZPL raw spooling
                        bool isZebraDriver = printerName.IndexOf("Zebra", StringComparison.OrdinalIgnoreCase) >= 0 
                                             || printerName.IndexOf("Generic", StringComparison.OrdinalIgnoreCase) >= 0;

                        if (isZebraDriver)
                        {
                            var rawPayload = new StringBuilder();
                            for (int i = 0; i < copies; i++)
                            {
                                rawPayload.Append(processedZpl).Append("\n");
                            }
                            
                            bool rawSuccess = RawPrinterHelper.SendStringToPrinter(printerName, rawPayload.ToString());
                            if (!rawSuccess)
                            {
                                throw new InvalidOperationException($"No se pudo enviar ZPL a la cola de impresión de la impresora USB '{printerName}'");
                            }
                            
                            result.PrinterUsed = $"{printerName} (USB Raw ZPL)";
                            result.Success = true;
                        }
                        else
                        {
                            // Standard Spooler Graphics Printing (GDI fallback for PDFs/Standard drivers)
                            var doc = new PrintDocument();
                            doc.PrinterSettings.PrinterName = printerName;
                            doc.PrinterSettings.Copies = (short)copies;

                            if (!doc.PrinterSettings.IsValid)
                            {
                                result.Success = false;
                                result.ErrorMessage = $"La impresora '{printerName}' no es válida o está desconectada.";
                                return result;
                            }

                            doc.PrintPage += (sender, ev) =>
                            {
                                DrawLabel(ev.Graphics!, validation);
                                ev.HasMorePages = false;
                            };

                            doc.Print();
                            result.PrinterUsed = printerName;
                            result.Success = true;
                        }
                    }
                }
                else
                {
                    result.PrinterUsed = "SIMULADOR (Virtual)";
                    result.Success = true;
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessage = $"Error al imprimir: {ex.Message}";
            }

            return result;
        }

        private string ReplaceZplPlaceholders(string zplTemplate, Validacion val)
        {
            if (string.IsNullOrEmpty(zplTemplate)) return string.Empty;

            string output = zplTemplate;
            output = output.Replace("{Puesto}", val.Puesto ?? "");
            output = output.Replace("{Referencia}", val.Referencia ?? "");
            output = output.Replace("{Ornamento}", string.IsNullOrEmpty(val.CodigoOrnamentoLeido) ? "SIN ORNAMENTO" : val.CodigoOrnamentoLeido);
            output = output.Replace("{OrdenProduccion}", val.ID_OrdenProduccion.ToString());
            output = output.Replace("{OrdenCliente}", val.ID_OrdenCliente.ToString());
            output = output.Replace("{Secuencia}", val.Secuencia?.ToString() ?? "N/A");
            output = output.Replace("{SD}", val.SD ?? "N/A");
            
            // Safe Mano / Pos extraction
            string mano = "N/A";
            if (!string.IsNullOrEmpty(val.Posicion) || !string.IsNullOrEmpty(val.Mano))
            {
                mano = $"{val.Posicion ?? "N/A"} - {val.Mano ?? "N/A"}";
            }
            else if (!string.IsNullOrEmpty(val.CodigoOrnamentoLeido) && val.CodigoOrnamentoLeido.Length >= 5)
            {
                mano = "F - " + val.CodigoOrnamentoLeido.Substring(val.CodigoOrnamentoLeido.Length - 5);
            }
            else if (!string.IsNullOrEmpty(val.CodigoOrnamentoLeido))
            {
                mano = "F - " + val.CodigoOrnamentoLeido;
            }
            output = output.Replace("{Mano}", mano);

            output = output.Replace("{MinutosCurado}", val.MinutosCurado?.ToString() ?? "0");
            output = output.Replace("{QrCompleto}", val.QrCompleto ?? "");
            output = output.Replace("{FechaLectura}", val.FechaLectura.ToString("dd/MM/yyyy HH:mm:ss"));
            return output;
        }

        public async Task<string> GeneratePreviewAsync(string zplTemplate, Validacion validation)
        {
            string processedZpl = ReplaceZplPlaceholders(zplTemplate, validation);
            return await GetLabelPreviewAsync(processedZpl, validation);
        }

        private async Task<string> GetLabelPreviewAsync(string zplCode, Validacion validation)
        {
            bool checkOnline = false;
            lock (_checkLock)
            {
                if (DateTime.Now - _lastConnectionCheck > TimeSpan.FromMinutes(5))
                {
                    checkOnline = true;
                    _lastConnectionCheck = DateTime.Now;
                }
            }

            if (checkOnline)
            {
                try
                {
                    using var httpClient = new HttpClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(2); // Fast check
                    string url = "http://api.labelary.com/v1/printers/8dpmm/labels/6x4/0/";
                    var response = await httpClient.PostAsync(url, new StringContent(zplCode, Encoding.UTF8, "application/x-www-form-urlencoded"));
                    
                    if (response.IsSuccessStatusCode)
                    {
                        _isLabelaryAvailable = true;
                        byte[] imageBytes = await response.Content.ReadAsByteArrayAsync();
                        return Convert.ToBase64String(imageBytes);
                    }
                    else
                    {
                        _isLabelaryAvailable = false;
                    }
                }
                catch
                {
                    _isLabelaryAvailable = false;
                }
            }
            else if (_isLabelaryAvailable)
            {
                // Try quick fetch since it was available recently
                try
                {
                    using var httpClient = new HttpClient();
                    httpClient.Timeout = TimeSpan.FromSeconds(1.5);
                    string url = "http://api.labelary.com/v1/printers/8dpmm/labels/6x4/0/";
                    var response = await httpClient.PostAsync(url, new StringContent(zplCode, Encoding.UTF8, "application/x-www-form-urlencoded"));
                    if (response.IsSuccessStatusCode)
                    {
                        byte[] imageBytes = await response.Content.ReadAsByteArrayAsync();
                        return Convert.ToBase64String(imageBytes);
                    }
                    else
                    {
                        _isLabelaryAvailable = false;
                    }
                }
                catch
                {
                    _isLabelaryAvailable = false;
                }
            }

            // Fallback GDI Local Drawing
            using (var bitmap = new Bitmap(600, 450))
            {
                using (var graphics = Graphics.FromImage(bitmap))
                {
                    graphics.Clear(Color.White);
                    DrawLabel(graphics, validation);
                }

                using (var ms = new MemoryStream())
                {
                    bitmap.Save(ms, ImageFormat.Png);
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
        }

        private async Task SendToNetworkZebraAsync(string ip, int port, string zplData)
        {
            using var client = new System.Net.Sockets.TcpClient();
            var connectTask = client.ConnectAsync(ip, port);
            
            // Timeout of 4 seconds for printer TCP socket connection
            if (await Task.WhenAny(connectTask, Task.Delay(4000)) == connectTask)
            {
                await connectTask; // propagate exceptions if connection failed
                using var stream = client.GetStream();
                byte[] data = Encoding.ASCII.GetBytes(zplData);
                await stream.WriteAsync(data, 0, data.Length);
            }
            else
            {
                throw new TimeoutException($"No se pudo conectar a la impresora Zebra en {ip}:{port} (Tiempo de espera de conexión agotado).");
            }
        }

        private void DrawLabel(Graphics g, Validacion val)
        {
            g.PageUnit = GraphicsUnit.Pixel;

            // Draw outer border
            var borderPen = new Pen(Color.Black, 4);
            g.DrawRectangle(borderPen, 10, 10, 580, 430);

            // Draw header bar
            g.FillRectangle(Brushes.Black, 10, 10, 580, 55);
            var headerFont = new Font("Arial", 16, FontStyle.Bold);
            g.DrawString("KANBAN DE PRODUCCIÓN - PUESTO: " + val.Puesto, headerFont, Brushes.White, 30, 22);

            // Draw separator line
            var blackPen = new Pen(Color.Black, 2);
            g.DrawLine(blackPen, 10, 240, 590, 240);
            g.DrawLine(blackPen, 410, 65, 410, 440);

            // Left Section: Panel and Ornament details
            var labelFont = new Font("Arial", 11, FontStyle.Regular);
            var boldFont = new Font("Arial", 12, FontStyle.Bold);
            var largePanelFont = new Font("Arial", 22, FontStyle.Bold);
            var largeOrnamentFont = new Font("Arial", 16, FontStyle.Bold);

            g.DrawString("PANEL SOLICITADO:", labelFont, Brushes.DimGray, 25, 80);
            g.DrawString(val.Referencia, largePanelFont, Brushes.Black, 25, 100);

            g.DrawString("ORNAMENTO:", labelFont, Brushes.DimGray, 25, 160);
            string ornamentText = string.IsNullOrEmpty(val.CodigoOrnamentoLeido) ? "SIN ORNAMENTO" : val.CodigoOrnamentoLeido;
            g.DrawString(ornamentText, largeOrnamentFont, Brushes.Black, 25, 180);

            // Bottom Left Section: Order details
            g.DrawString("Orden Prod ID:", labelFont, Brushes.DimGray, 25, 255);
            g.DrawString(val.ID_OrdenProduccion.ToString(), boldFont, Brushes.Black, 25, 275);

            g.DrawString("Orden Cliente:", labelFont, Brushes.DimGray, 180, 255);
            g.DrawString(val.ID_OrdenCliente.ToString(), boldFont, Brushes.Black, 180, 275);

            g.DrawString("Nro Secuencia:", labelFont, Brushes.DimGray, 25, 315);
            g.DrawString(val.Secuencia?.ToString() ?? "N/A", boldFont, Brushes.Black, 25, 335);

            g.DrawString("Modelo / SD:", labelFont, Brushes.DimGray, 180, 315);
            g.DrawString($"{val.SD ?? "N/A"}", boldFont, Brushes.Black, 180, 335);

            g.DrawString("Posición y Mano:", labelFont, Brushes.DimGray, 25, 375);
            string mano = "N/A";
            if (!string.IsNullOrEmpty(val.Posicion) || !string.IsNullOrEmpty(val.Mano))
            {
                mano = $"{val.Posicion ?? "N/A"} - {val.Mano ?? "N/A"}";
            }
            else if (!string.IsNullOrEmpty(val.CodigoOrnamentoLeido) && val.CodigoOrnamentoLeido.Length >= 5)
            {
                mano = "F - " + val.CodigoOrnamentoLeido.Substring(val.CodigoOrnamentoLeido.Length - 5);
            }
            else if (!string.IsNullOrEmpty(val.CodigoOrnamentoLeido))
            {
                mano = "F - " + val.CodigoOrnamentoLeido;
            }
            g.DrawString(mano, boldFont, Brushes.Black, 25, 395);

            // Right Section: Curing and QR info
            g.DrawString("INICIO CURADO:", labelFont, Brushes.DimGray, 425, 80);
            string startCureStr = val.InicioCurado?.ToString("dd/MM/yyyy HH:mm") ?? "N/A (NO LLEVA)";
            g.DrawString(startCureStr, boldFont, Brushes.Black, 425, 100);

            g.DrawString("TIEMPO CURADO:", labelFont, Brushes.DimGray, 425, 135);
            string totalCureStr = val.MinutosCurado.HasValue ? $"{val.MinutosCurado.Value / 60} h {val.MinutosCurado.Value % 60} min" : "N/A";
            g.DrawString(totalCureStr, boldFont, Brushes.Black, 425, 155);

            g.DrawString("FECHA IMPRESIÓN:", labelFont, Brushes.DimGray, 425, 195);
            g.DrawString(DateTime.Now.ToString("dd/MM/yyyy HH:mm:ss"), boldFont, Brushes.Black, 425, 215);

            // Draw a mock visual barcode/QR representation in the right panel
            g.DrawRectangle(Pens.Black, 435, 260, 130, 130);
            g.FillRectangle(Brushes.LightGray, 440, 265, 120, 120);
            
            var barcodeFont = new Font("Courier New", 8, FontStyle.Regular);
            g.DrawString("[ BARCODE / QR ]", barcodeFont, Brushes.Black, 442, 315);
            string opSub = val.ID_Operacion.ToString();
            if (opSub.Length > 18) opSub = opSub.Substring(0, 18);
            g.DrawString(opSub, barcodeFont, Brushes.Black, 422, 400);
        }
    }
}
