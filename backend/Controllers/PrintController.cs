using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Backend.Services;
using Backend.Models;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PrintController : ControllerBase
    {
        private readonly IPrintingService _printer;

        public PrintController(IPrintingService printer)
        {
            _printer = printer;
        }

        [HttpGet("printers")]
        public IActionResult GetPrinters()
        {
            try
            {
                var list = _printer.GetInstalledPrinters();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener impresoras del sistema.", detail = ex.Message });
            }
        }

        [HttpPost("test")]
        public async System.Threading.Tasks.Task<IActionResult> TestPrint([FromQuery] string printerName, [FromQuery] string panelCode = "67610-0KM60-C0")
        {
            var config = new Dictionary<string, string>
            {
                { "Printer_Simulator_Enabled", "false" },
                { "Printer_Name", printerName },
                { "Print_Copies", "1" }
            };

            var mockValidation = new Validacion
            {
                ID_OrdenProduccion = 9999,
                ID_OrdenCliente = 9999,
                Orden = 1,
                Secuencia = 999,
                SD = "TEST-SD",
                Referencia = panelCode,
                CodigoOrnamentoLeido = "TEST-ORNAMENT-123",
                Puesto = "TEST-PUESTO",
                Operador = "TEST-USER",
                FechaLectura = DateTime.Now,
                InicioCurado = DateTime.Now.AddHours(-5),
                MinutosCurado = 300,
                ID_Operacion = Guid.NewGuid()
            };

            try
            {
                var result = await _printer.PrintKanbanAsync(mockValidation, config);
                if (result.Success)
                {
                    return Ok(new { message = "Prueba de impresión enviada.", preview = result.Base64LabelPreview });
                }
                return BadRequest(new { message = "Fallo de prueba de impresión.", detail = result.ErrorMessage });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error de impresión.", detail = ex.Message });
            }
        }
    }
}
