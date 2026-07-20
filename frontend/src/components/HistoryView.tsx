import React, { useState, useEffect } from 'react';
import { Search, Download, FileText, CheckCircle, XCircle } from 'lucide-react';

interface ValidationRow {
  iD_Validacion: number;
  iD_Operacion: string;
  iD_OrdenProduccion: number;
  iD_OrdenCliente: number;
  orden: number;
  secuencia: number | null;
  sd: string | null;
  referencia: string;
  codigoOrnamentoEsperado: string | null;
  codigoOrnamentoLeido: string | null;
  qrCompleto: string;
  numeroSerie: string | null;
  lote: string | null;
  inicioCurado: string | null;
  fechaActualServidor: string;
  minutosCurado: number | null;
  tiempoMinimoRequerido: number | null;
  resultadoCurado: string | null;
  resultadoCorrespondencia: string | null;
  resultadoGeneral: string;
  motivoRechazo: string | null;
  puesto: string;
  operador: string;
  fechaLectura: string;
  estadoImpresion: string | null;
  impresora: string | null;
  fechaAvancePuntero: string | null;
}

interface HistoryViewProps {
  apiBaseUrl: string;
  onClose: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ apiBaseUrl, onClose }) => {
  const [history, setHistory] = useState<ValidationRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [panel, setPanel] = useState('');
  const [ornament, setOrnament] = useState('');
  const [ordenId, setOrdenId] = useState('');
  const [secuencia, setSecuencia] = useState('');
  const [puestoFilter, setPuestoFilter] = useState('');
  const [result, setResult] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      // Assemble query params
      const params = new URLSearchParams();
      if (desde) params.append('desde', new Date(desde).toISOString());
      if (hasta) params.append('hasta', new Date(hasta).toISOString());
      if (panel) params.append('panel', panel);
      if (ornament) params.append('ornament', ornament);
      if (ordenId) params.append('ordenId', ordenId);
      if (secuencia) params.append('secuencia', secuencia);
      if (puestoFilter) params.append('puesto', puestoFilter);
      if (result) params.append('result', result);

      const res = await fetch(`${apiBaseUrl}/api/validation/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (desde) params.append('desde', new Date(desde).toISOString());
    if (hasta) params.append('hasta', new Date(hasta).toISOString());
    if (panel) params.append('panel', panel);
    if (ornament) params.append('ornament', ornament);
    if (ordenId) params.append('ordenId', ordenId);
    if (secuencia) params.append('secuencia', secuencia);
    if (puestoFilter) params.append('puesto', puestoFilter);
    if (result) params.append('result', result);

    window.open(`${apiBaseUrl}/api/validation/export?${params.toString()}`, '_blank');
  };

  const handleResetFilters = () => {
    setDesde('');
    setHasta('');
    setPanel('');
    setOrnament('');
    setOrdenId('');
    setSecuencia('');
    setPuestoFilter('');
    setResult('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* HEADER ACTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Historial de Validaciones y Trazabilidad</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Auditoría completa de escaneos y punteros avanzados</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={handleExport} style={{ backgroundColor: '#10b981' }}>
            <Download size={18} />
            Exportar CSV
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Volver a Operaciones
          </button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <section className="card-panel" style={{ padding: '16px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Desde:</label>
          <input type="datetime-local" className="form-input" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Hasta:</label>
          <input type="datetime-local" className="form-input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Código Panel:</label>
          <input type="text" className="form-input" placeholder="Buscar panel..." value={panel} onChange={(e) => setPanel(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Código Ornamento:</label>
          <input type="text" className="form-input" placeholder="Buscar ornamento..." value={ornament} onChange={(e) => setOrnament(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Orden ID:</label>
          <input type="number" className="form-input" placeholder="Ej: 953" value={ordenId} onChange={(e) => setOrdenId(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Secuencia:</label>
          <input type="number" className="form-input" placeholder="Ej: 101" value={secuencia} onChange={(e) => setSecuencia(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Puesto:</label>
          <input type="text" className="form-input" placeholder="Ej: DL01" value={puestoFilter} onChange={(e) => setPuestoFilter(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Resultado:</label>
          <select className="form-input" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="">Todos</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>

        <div style={{ gridColumn: 'span 4', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
          <button className="btn btn-secondary" onClick={handleResetFilters}>
            Limpiar Filtros
          </button>
          <button className="btn btn-primary" onClick={fetchHistory}>
            <Search size={16} />
            Aplicar Filtros
          </button>
        </div>
      </section>

      {/* HISTORY TABLE GRID */}
      <section className="card-panel" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <span>Cargando logs del servidor...</span>
            </div>
          ) : history.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Puesto</th>
                  <th>Orden ID</th>
                  <th>Secuencia</th>
                  <th>Panel</th>
                  <th>Ornamento Esperado</th>
                  <th>Ornamento Leído</th>
                  <th>Resultado</th>
                  <th>Motivo Rechazo</th>
                  <th>Impresión</th>
                  <th>Puntero DB</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.iD_Validacion}>
                    <td style={{ fontSize: '13px' }}>{new Date(row.fechaLectura).toLocaleString()}</td>
                    <td><strong style={{ color: 'var(--accent-color)' }}>{row.puesto}</strong></td>
                    <td>{row.iD_OrdenProduccion}</td>
                    <td>{row.secuencia ?? 'N/A'}</td>
                    <td><strong>{row.referencia}</strong></td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{row.codigoOrnamentoEsperado || 'N/A'}</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{row.codigoOrnamentoLeido || 'N/A'}</td>
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: row.resultadoGeneral === 'APROBADO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: row.resultadoGeneral === 'APROBADO' ? '#10b981' : '#f87171'
                      }}>
                        {row.resultadoGeneral === 'APROBADO' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {row.resultadoGeneral}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#f87171' }}>{row.motivoRechazo || '-'}</td>
                    <td>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: row.estadoImpresion === 'COMPLETO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: row.estadoImpresion === 'COMPLETO' ? '#10b981' : '#f59e0b'
                      }}>
                        {row.estadoImpresion || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '11px',
                        color: row.fechaAvancePuntero ? '#10b981' : '#6b7280'
                      }}>
                        {row.fechaAvancePuntero ? 'Avanzado ✓' : 'Pendiente ❌'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <span>No se encontraron registros de trazabilidad</span>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};
