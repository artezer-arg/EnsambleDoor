using System;

namespace Backend.Models
{
    public class PanelSequence
    {
        public string Referencia { get; set; } = string.Empty;
        public int ID_OrdenProduccion { get; set; }
        public int ID_OrdenCliente { get; set; }
        public int Orden { get; set; }
        public int Secuencia { get; set; }
        public string SD { get; set; } = string.Empty;
        public string Expr1 { get; set; } = string.Empty;
        public string Puesto { get; set; } = string.Empty;
    }

    public class Equivalencia
    {
        public int ID_Equivalencia { get; set; }
        public string CodigoPanel { get; set; } = string.Empty;
        public string? CodigoOrnamento { get; set; }
        public bool RequiereOrnamento { get; set; }
        public bool Activo { get; set; }
        public DateTime FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public DateTime FechaModificacion { get; set; }
        public string UsuarioModificacion { get; set; } = "SYSTEM";
    }

    public class Validacion
    {
        public int ID_Validacion { get; set; }
        public Guid ID_Operacion { get; set; } = Guid.NewGuid();
        public int ID_OrdenProduccion { get; set; }
        public int ID_OrdenCliente { get; set; }
        public int Orden { get; set; }
        public int? Secuencia { get; set; }
        public string? SD { get; set; }
        public string Referencia { get; set; } = string.Empty;
        public string? CodigoOrnamentoEsperado { get; set; }
        public string? CodigoOrnamentoLeido { get; set; }
        public string QrCompleto { get; set; } = string.Empty;
        public string? NumeroSerie { get; set; }
        public string? Lote { get; set; }
        public DateTime? InicioCurado { get; set; }
        public DateTime FechaActualServidor { get; set; } = DateTime.Now;
        public int? MinutosCurado { get; set; }
        public int? TiempoMinimoRequerido { get; set; }
        public string? ResultadoCurado { get; set; }
        public string? ResultadoCorrespondencia { get; set; }
        public string ResultadoGeneral { get; set; } = "PENDIENTE";
        public string? MotivoRechazo { get; set; }
        public string Puesto { get; set; } = string.Empty;
        public string Operador { get; set; } = "OPERADOR";
        public DateTime FechaLectura { get; set; } = DateTime.Now;
        public DateTime? FechaImpresion { get; set; }
        public string? Impresora { get; set; }
        public string? EstadoImpresion { get; set; }
        public DateTime? FechaAvancePuntero { get; set; }
        public string? MensajeErrorTecnico { get; set; }
    }

    public class ConfigValue
    {
        public string Clave { get; set; } = string.Empty;
        public string Valor { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public DateTime FechaModificacion { get; set; } = DateTime.Now;
        public string UsuarioModificacion { get; set; } = "SYSTEM";
    }

    public class AuditConfig
    {
        public int ID_Auditoria { get; set; }
        public string Clave { get; set; } = string.Empty;
        public string? ValorAnterior { get; set; }
        public string ValorNuevo { get; set; } = string.Empty;
        public DateTime FechaModificacion { get; set; } = DateTime.Now;
        public string UsuarioModificacion { get; set; } = string.Empty;
        public string? Motivo { get; set; }
    }
}
