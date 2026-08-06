import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Printer, RefreshCw, Layers, 
  HelpCircle, Sparkles, CheckCircle2, AlertTriangle 
} from 'lucide-react';

interface LabelDesignerProps {
  apiBaseUrl: string;
  onClose: () => void;
  onConfigUpdated: () => void;
}

interface SimulatedData {
  puesto: string;
  referencia: string;
  codigoOrnamentoLeido: string;
  id_OrdenProduccion: number;
  id_OrdenCliente: number;
  secuencia: number;
  sd: string;
  qrCompleto: string;
  minutosCurado: number;
  mano: string;
}

export const LabelDesigner: React.FC<LabelDesignerProps> = ({ apiBaseUrl, onClose, onConfigUpdated }) => {
  const [zplCode, setZplCode] = useState('');
  const [originalZpl, setOriginalZpl] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  // Simulated validation data state
  const [simData, setSimData] = useState<SimulatedData>({
    puesto: 'DL01',
    referencia: '67610-0KM60-C0',
    codigoOrnamentoLeido: 'ORN-9988-X',
    id_OrdenProduccion: 5821,
    id_OrdenCliente: 9283,
    secuencia: 147,
    sd: 'SD-420-A',
    qrCompleto: 'ORN-9988-X;202608061200;SERIAL-0042',
    minutosCurado: 300,
    mano: 'F - 9988-X'
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ZPL Templates Presets
  const presets = {
    standard: `^XA
^LH30,20
^FO10,10^GB560,410,4^FS
^CF0,24
^FO30,30^FDETIQUETA KANBAN - PUESTO: {Puesto}^FS
^FO10,65^GB560,2,2^FS
^CF0,40
^FO35,90^FD{Referencia}^FS
^CF0,26
^FO35,160^FDORNAMENTO: {Ornamento}^FS
^FO10,210^GB560,2,2^FS
^CF0,24
^FO35,230^FDOrden Prod: {OrdenProduccion}^FS
^FO260,230^FDCliente: {OrdenCliente}^FS
^FO35,275^FDSecuencia: {Secuencia}^FS
^FO260,275^FDModelo: {SD}^FS
^FO35,320^FDMano/Pos: {Mano}^FS
^FO35,365^FDCurado: {MinutosCurado} min^FS
^FO420,230^BQN,2,6^FDQA,{QrCompleto}^FS
^XZ`,

    detailedQr: `^XA
^LH20,20
^FO10,10^GB580,410,4^FS
^CF0,20
^FO30,30^FDKANBAN VALIDACION - PUESTO: {Puesto}^FS
^FO10,60^GB580,2,2^FS
^CF0,44
^FO30,80^FD{Referencia}^FS
^CF0,24
^FO30,135^FDOmn: {Ornamento}^FS
^FO30,170^FDMano: {Mano}^FS
^FO10,210^GB580,2,2^FS
^CF0,20
^FO30,230^FDOP ID: {OrdenProduccion}^FS
^FO30,260^FDORD CLIENTE: {OrdenCliente}^FS
^FO30,290^FDSECUENCIA: {Secuencia}^FS
^FO30,320^FDT. CURADO: {MinutosCurado} min^FS
^FO30,350^FDFECHA IMP: {FechaLectura}^FS
^FO330,230^BQN,2,7^FDQA,Puesto:{Puesto};Ref:{Referencia};Seq:{Secuencia};Cure:{MinutosCurado};QR:{QrCompleto}^FS
^FO380,380^FDLECTURA QR KANBAN^FS
^XZ`,

    compact: `^XA
^LH10,10
^FO10,10^GB380,280,3^FS
^CF0,18
^FO20,25^FDPUESTO: {Puesto} - SEC: {Secuencia}^FS
^FO10,50^GB380,2,2^FS
^CF0,30
^FO20,70^FD{Referencia}^FS
^CF0,18
^FO20,115^FDORN: {Ornamento}^FS
^FO20,140^FDOP: {OrdenProduccion} | CL: {OrdenCliente}^FS
^FO20,165^FDCURADO: {MinutosCurado} min^FS
^FO20,195^FDFECHA: {FechaLectura}^FS
^FO260,110^BQN,2,5^FDQA,{QrCompleto}^FS
^XZ`
  };

  useEffect(() => {
    loadTemplateFromDb();
    loadPrinters();
  }, []);

  const loadTemplateFromDb = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/config`);
      if (res.ok) {
        const data = await res.json();
        const template = data.Printer_Zpl_Template || presets.standard;
        setZplCode(template);
        setOriginalZpl(template);
        fetchPreview(template, simData);
      }
    } catch (e) {
      console.warn("Error cargando plantilla inicial. Usando preset estándar.", e);
      setZplCode(presets.standard);
      fetchPreview(presets.standard, simData);
    }
  };

  const loadPrinters = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/print/printers`);
      if (res.ok) {
        const list = await res.json();
        setPrinters(list);
        if (list.length > 0) {
          setSelectedPrinter(list[0]);
        }
      }
    } catch (e) {
      console.error("Error obteniendo impresoras", e);
    }
  };

  const fetchPreview = async (templateToRender: string, dataToUse: SimulatedData) => {
    if (!templateToRender) return;
    setIsLoadingPreview(true);
    setPreviewError(null);

    // Prepare simulated validation payload for the backend API
    const validationData = {
      id_Validacion: 0,
      id_Operacion: '00000000-0000-0000-0000-000000000000',
      id_OrdenProduccion: dataToUse.id_OrdenProduccion,
      id_OrdenCliente: dataToUse.id_OrdenCliente,
      orden: 1,
      secuencia: dataToUse.secuencia,
      sd: dataToUse.sd,
      referencia: dataToUse.referencia,
      codigoOrnamentoEsperado: dataToUse.codigoOrnamentoLeido,
      codigoOrnamentoLeido: dataToUse.codigoOrnamentoLeido,
      qrCompleto: dataToUse.qrCompleto,
      numeroSerie: '1001',
      lote: 'L-2026',
      inicioCurado: new Date(Date.now() - dataToUse.minutosCurado * 60 * 1000).toISOString(),
      fechaActualServidor: new Date().toISOString(),
      minutosCurado: dataToUse.minutosCurado,
      tiempoMinimoRequerido: 240,
      resultadoCurado: 'APROBADO',
      resultadoCorrespondencia: 'CORRECTO',
      resultadoGeneral: 'APROBADO',
      puesto: dataToUse.puesto,
      operador: 'SIM_USER',
      fechaLectura: new Date().toISOString()
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/print/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zplTemplate: templateToRender,
          validationData
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.preview) {
          setPreviewImage(result.preview);
        } else {
          setPreviewError('La API no retornó una vista previa válida.');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setPreviewError(errorData.message || `Error del servidor (${response.status})`);
      }
    } catch (e: any) {
      // Direct call fallback to Labelary if the API is unreachable (helps if local server is down during dev)
      console.warn("Fallo de conexión con backend local. Intentando llamada directa a Labelary...", e);
      try {
        // Substitute variables client-side for direct Labelary simulation
        let zplSimulated = templateToRender;
        zplSimulated = zplSimulated.replace(/{Puesto}/g, dataToUse.puesto);
        zplSimulated = zplSimulated.replace(/{Referencia}/g, dataToUse.referencia);
        zplSimulated = zplSimulated.replace(/{Ornamento}/g, dataToUse.codigoOrnamentoLeido);
        zplSimulated = zplSimulated.replace(/{OrdenProduccion}/g, dataToUse.id_OrdenProduccion.toString());
        zplSimulated = zplSimulated.replace(/{OrdenCliente}/g, dataToUse.id_OrdenCliente.toString());
        zplSimulated = zplSimulated.replace(/{Secuencia}/g, dataToUse.secuencia.toString());
        zplSimulated = zplSimulated.replace(/{SD}/g, dataToUse.sd);
        zplSimulated = zplSimulated.replace(/{Mano}/g, dataToUse.mano);
        zplSimulated = zplSimulated.replace(/{MinutosCurado}/g, dataToUse.minutosCurado.toString());
        zplSimulated = zplSimulated.replace(/{QrCompleto}/g, dataToUse.qrCompleto);
        zplSimulated = zplSimulated.replace(/{FechaLectura}/g, new Date().toLocaleString());

        const labelaryRes = await fetch('http://api.labelary.com/v1/printers/8dpmm/labels/6x4/0/', {
          method: 'POST',
          body: zplSimulated
        });
        
        if (labelaryRes.ok) {
          const blob = await labelaryRes.blob();
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setPreviewImage(base64data.split(',')[1]);
          };
        } else {
          setPreviewError('No se pudo conectar al HMI local ni al servidor externo de Labelary.');
        }
      } catch (extError: any) {
        setPreviewError(`Error de red: no hay conexión al backend en ${apiBaseUrl}`);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSimDataChange = (field: keyof SimulatedData, value: string | number) => {
    const updated = { ...simData, [field]: value };
    setSimData(updated);
    // Auto-update preview
    fetchPreview(zplCode, updated);
  };

  const insertVariable = (variable: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const text = textareaRef.current.value;
      const placeholder = `{${variable}}`;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      setZplCode(newText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + placeholder.length;
        }
      }, 50);
    } else {
      setZplCode(prev => prev + `{${variable}}`);
    }
  };

  const loadPreset = (presetKey: keyof typeof presets) => {
    if (window.confirm('¿Desea sobrescribir el diseño actual con esta plantilla predefinida?')) {
      const selectedPreset = presets[presetKey];
      setZplCode(selectedPreset);
      fetchPreview(selectedPreset, simData);
    }
  };

  const handleSaveTemplate = async () => {
    setSaveStatus({ type: null, message: '' });
    try {
      const res = await fetch(`${apiBaseUrl}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'Printer_Zpl_Template',
          value: zplCode,
          user: 'ADMIN_DISEÑO',
          motivo: 'Rediseño de etiqueta Kanban desde Diseñador Visual'
        })
      });

      if (res.ok) {
        setOriginalZpl(zplCode);
        setSaveStatus({ type: 'success', message: '¡Plantilla guardada con éxito en la base de datos!' });
        onConfigUpdated();
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveStatus({ type: 'error', message: err.message || 'Error al guardar la plantilla.' });
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: `Fallo de red: ${e.message}` });
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      setPrintStatus({ type: 'error', message: 'No hay impresora seleccionada.' });
      return;
    }
    setPrintStatus({ type: null, message: 'Enviando cola de impresión...' });

    try {
      // First save to make sure we print the current active designer layout,
      // as test endpoint fetches it from the system configuration.
      const saveOk = await fetch(`${apiBaseUrl}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'Printer_Zpl_Template',
          value: zplCode,
          user: 'ADMIN_DISEÑO',
          motivo: 'Actualización temporal para impresión de prueba'
        })
      });

      if (!saveOk.ok) {
        setPrintStatus({ type: 'error', message: 'No se pudo registrar la plantilla antes de imprimir.' });
        return;
      }

      setOriginalZpl(zplCode);
      onConfigUpdated();

      // Trigger test print
      const res = await fetch(
        `${apiBaseUrl}/api/print/test?printerName=${encodeURIComponent(selectedPrinter)}&panelCode=${encodeURIComponent(simData.referencia)}`,
        { method: 'POST' }
      );

      if (res.ok) {
        setPrintStatus({ type: 'success', message: '¡Prueba enviada con éxito a ' + selectedPrinter + '!' });
        setTimeout(() => setPrintStatus({ type: null, message: '' }), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setPrintStatus({ type: 'error', message: err.detail || err.message || 'Error en el servicio de impresión.' });
      }
    } catch (e: any) {
      setPrintStatus({ type: 'error', message: `Fallo de conexión: ${e.message}` });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: '#070a13',
      color: '#fff',
      overflow: 'hidden'
    }} className="slide-up">
      
      {/* HEADER SECTION */}
      <header style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#0a0d16',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Diseñador Visual de Etiquetas</h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Edite y visualice la plantilla ZPL de Kanban con variables en tiempo real.
            </p>
          </div>
        </div>
        
        {/* Actions buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
            Cerrar Diseñador
          </button>
          
          <button 
            onClick={handleSaveTemplate} 
            disabled={zplCode === originalZpl}
            className="btn btn-primary" 
            style={{ 
              padding: '8px 16px', 
              fontSize: '14px',
              opacity: zplCode === originalZpl ? 0.6 : 1,
              cursor: zplCode === originalZpl ? 'default' : 'pointer',
              boxShadow: zplCode !== originalZpl ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
            }}
          >
            <Save size={16} />
            Guardar Diseño
          </button>
        </div>
      </header>

      {/* VIEWPORT SPLIT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: EDITOR & CHEATSHEET */}
        <div style={{
          flex: '1.2',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          
          {/* Subheader: Presets & Tools */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#0a0d16',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Presets:</span>
              <button onClick={() => loadPreset('standard')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}>
                Estándar Barcode
              </button>
              <button onClick={() => loadPreset('detailedQr')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}>
                QR Detallado
              </button>
              <button onClick={() => loadPreset('compact')} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}>
                Compacto (2x3)
              </button>
            </div>
            
            <button 
              onClick={() => setShowCheatsheet(!showCheatsheet)} 
              className="btn" 
              style={{ 
                padding: '4px 10px', 
                fontSize: '11px', 
                borderRadius: '4px',
                backgroundColor: showCheatsheet ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: '1px solid ' + (showCheatsheet ? '#3b82f6' : 'var(--border-color)'),
                color: showCheatsheet ? '#3b82f6' : '#fff'
              }}
            >
              <HelpCircle size={12} />
              Ayuda ZPL
            </button>
          </div>

          {/* Quick Variables Insert Bar */}
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#0c101d',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginRight: '6px' }}>Insertar Variable:</span>
            {['Puesto', 'Referencia', 'Ornamento', 'OrdenProduccion', 'OrdenCliente', 'Secuencia', 'SD', 'Mano', 'MinutosCurado', 'QrCompleto', 'FechaLectura'].map(v => (
              <button 
                key={v}
                onClick={() => insertVariable(v)}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                &#123;{v}&#125;
              </button>
            ))}
          </div>

          {/* Code Editor Frame */}
          <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <textarea
              ref={textareaRef}
              className="form-input"
              value={zplCode}
              onChange={(e) => {
                setZplCode(e.target.value);
                // Debounce / Trigger live render
              }}
              style={{
                flex: 1,
                width: '100%',
                margin: 0,
                padding: '20px',
                border: 'none',
                backgroundColor: '#04070e',
                color: '#10b981', // green console text
                fontFamily: 'Fira Code, Consolas, Monaco, Courier New, monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder="Escriba código ZPL..."
            />
            
            {/* Save Status Overlay */}
            {saveStatus.message && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                right: '20px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: saveStatus.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(220, 38, 38, 0.95)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                animation: 'slideUp 0.2s ease-out',
                zIndex: 100
              }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{saveStatus.message}</span>
              </div>
            )}
          </div>

          {/* ZPL Cheatsheet Drawer */}
          {showCheatsheet && (
            <div style={{
              height: '180px',
              backgroundColor: '#0a0d16',
              borderTop: '1px solid var(--border-color)',
              overflowY: 'auto',
              padding: '12px 20px',
              fontSize: '12px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--accent-color)' }}>Referencia Rápida de Comandos ZPL</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                <div><strong>^XA / ^XZ</strong>: Inicio y fin de etiqueta.</div>
                <div><strong>^LH x,y</strong>: Coordenada de origen (Home position).</div>
                <div><strong>^FO x,y</strong>: Posición de campo (Field Origin).</div>
                <div><strong>^A f,h,w</strong>: Selección de fuente (Font, altura, ancho).</div>
                <div><strong>^FD texto^FS</strong>: Datos del campo (Field Data) y separador (Field Separator).</div>
                <div><strong>^GB w,h,t,c</strong>: Dibujar caja o línea (Graphic Box: ancho, alto, espesor).</div>
                <div><strong>^BC o,h,y...</strong>: Código de barras 128 (Barcode Code 128).</div>
                <div><strong>^BQN,2,scale^FDQA,data^FS</strong>: Código QR (2D Barcode QR Code).</div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PREVIEW & SIMULATED DATA */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#090c14',
          overflowY: 'auto',
          padding: '24px',
          gap: '24px',
          boxSizing: 'border-box'
        }}>
          
          {/* VISUAL PREVIEW BLOCK */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Vista Previa del Kanban
              </span>
              
              <button 
                onClick={() => fetchPreview(zplCode, simData)}
                disabled={isLoadingPreview}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
              >
                <RefreshCw size={12} className={isLoadingPreview ? 'pulse' : ''} />
                Actualizar Vista Previa
              </button>
            </div>

            <div style={{
              background: '#111827',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              minHeight: '340px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '20px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
            }}>
              {isLoadingPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="pulse" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid var(--accent-color)', borderTopColor: 'transparent', animation: 'spin 1s infinite linear' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Procesando plantilla ZPL...</span>
                </div>
              ) : previewError ? (
                <div style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={36} style={{ color: '#f59e0b' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Fallo de renderizado</div>
                  <div style={{ fontSize: '12px', color: '#ef4444', maxWidth: '300px' }}>{previewError}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Verifique que el backend esté ejecutándose o la sintaxis ZPL.</span>
                </div>
              ) : previewImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    padding: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    maxWidth: '100%',
                    display: 'inline-block'
                  }}>
                    <img 
                      src={`data:image/png;base64,${previewImage}`} 
                      alt="Zebra Preview" 
                      style={{ 
                        display: 'block', 
                        maxWidth: '100%', 
                        maxHeight: '380px',
                        objectFit: 'contain'
                      }} 
                    />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Escala estándar 8dpmm (203 dpi) | 6x4 pulgadas aprox.</span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sin datos de previsualización.</span>
              )}
            </div>
          </div>

          {/* SIMULATED DATA PANEL */}
          <div className="card-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
              Simular Variables de Datos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Puesto:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.puesto} 
                  onChange={(e) => handleSimDataChange('puesto', e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Referencia:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.referencia} 
                  onChange={(e) => handleSimDataChange('referencia', e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Ornamento Leído:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.codigoOrnamentoLeido} 
                  onChange={(e) => handleSimDataChange('codigoOrnamentoLeido', e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Nro Secuencia:</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.secuencia} 
                  onChange={(e) => handleSimDataChange('secuencia', parseInt(e.target.value) || 0)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Orden Producción:</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.id_OrdenProduccion} 
                  onChange={(e) => handleSimDataChange('id_OrdenProduccion', parseInt(e.target.value) || 0)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Orden Cliente:</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.id_OrdenCliente} 
                  onChange={(e) => handleSimDataChange('id_OrdenCliente', parseInt(e.target.value) || 0)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Modelo / SD:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.sd} 
                  onChange={(e) => handleSimDataChange('sd', e.target.value)} 
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Minutos Curado:</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.minutosCurado} 
                  onChange={(e) => handleSimDataChange('minutosCurado', parseInt(e.target.value) || 0)} 
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Contenido Completo QR (QA):</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={simData.qrCompleto} 
                  onChange={(e) => handleSimDataChange('qrCompleto', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* PHYSICAL PRINTER TESTING PANEL */}
          <div className="card-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Printer size={16} style={{ color: 'var(--accent-color)' }} />
              Prueba de Impresión Física
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '11px', marginBottom: '4px' }}>Impresora Spooler del Sistema:</label>
                {printers.length > 0 ? (
                  <select 
                    value={selectedPrinter} 
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '13px', background: '#000', cursor: 'pointer' }}
                  >
                    {printers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                    No se detectaron impresoras instaladas en el servidor local.
                  </div>
                )}
              </div>

              <button 
                onClick={handleTestPrint}
                disabled={printers.length === 0}
                className="btn btn-secondary"
                style={{ 
                  padding: '10px 16px', 
                  fontSize: '13px', 
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%'
                }}
              >
                <Printer size={14} />
                Imprimir Etiqueta de Prueba
              </button>

              {printStatus.message && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: printStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : printStatus.type === 'error' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid ' + (printStatus.type === 'success' ? '#10b981' : printStatus.type === 'error' ? '#ef4444' : '#3b82f6'),
                  color: printStatus.type === 'success' ? '#10b981' : printStatus.type === 'error' ? '#ef4444' : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {printStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  <span>{printStatus.message}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Embedded Spin Animation keyframe CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
    </div>
  );
};
