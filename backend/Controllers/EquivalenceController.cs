using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EquivalenceController : ControllerBase
    {
        private readonly IDatabaseService _dbService;

        public EquivalenceController(IDatabaseService dbService)
        {
            _dbService = dbService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var list = await _dbService.GetEquivalencesAsync();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al obtener las equivalencias.", detail = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Save([FromBody] Equivalencia equiv, [FromQuery] string user = "ADMIN")
        {
            if (equiv == null || string.IsNullOrEmpty(equiv.CodigoPanel))
            {
                return BadRequest("Datos de equivalencia inválidos.");
            }

            try
            {
                var success = await _dbService.UpsertEquivalenceAsync(equiv, user);
                return Ok(new { success, message = "Equivalencia guardada correctamente." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al guardar equivalencia.", detail = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var success = await _dbService.DeleteEquivalenceAsync(id);
                if (!success)
                {
                    return NotFound(new { message = "Equivalencia no encontrada." });
                }
                return Ok(new { success, message = "Equivalencia eliminada (desactivada) correctamente." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al eliminar equivalencia.", detail = ex.Message });
            }
        }
    }
}
