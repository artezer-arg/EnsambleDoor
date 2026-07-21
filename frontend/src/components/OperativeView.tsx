import React, { useState, useEffect } from 'react';
import { 
  Database, Printer, CheckCircle, XCircle, AlertTriangle, RefreshCw, 
  User, ShieldAlert, Cpu, HelpCircle, Volume2
} from 'lucide-react';

// Code 39 Barcode Patterns for Offline Rendering
const CODE39_PATTERNS: Record<string, string> = {
  '0': 'n n n w w n w n n', '1': 'w n n w n n n n w', '2': 'n n w w n n n n w',
  '3': 'w n w w n n n n n', '4': 'n n n w w n n n w', '5': 'w n n w w n n n n',
  '6': 'n n w w w n n n n', '7': 'n n n w n n w n w', '8': 'w n n w n n w n n',
  '9': 'n n w w n n w n n', 'A': 'w n n n n w n n w', 'B': 'n n w n n w n n w',
  'C': 'w n w n n w n n n', 'D': 'n n n n w w n n w', 'E': 'w n n n w w n n n',
  'F': 'n n w n w w n n n', 'G': 'n n n n n w w n w', 'H': 'w n n n n w w n n',
  'I': 'n n w n n w w n n', 'J': 'n n n n w w w n n', 'K': 'w n n n n n n w w',
  'L': 'n n w n n n n w w', 'M': 'w n w n n n n w n', 'N': 'n n n n w n n w w',
  'O': 'w n n n w n n w n', 'P': 'n n w n w n n w n', 'Q': 'n n n n n n w w w',
  'R': 'w n n n n n w w n', 'S': 'n n w n n n w w n', 'T': 'n n n n w n w w n',
  'U': 'w w n n n n n n w', 'V': 'n w w n n n n n w', 'W': 'w w w n n n n n n',
  'X': 'n w n n w n n n w', 'Y': 'w w n n w n n n n', 'Z': 'n w w n w n n n n',
  '-': 'n w n n n n w n w', '.': 'w w n n n n w n n', ' ': 'n w w n n n w n n',
  '*': 'n w n n w n w n n', '$': 'n w n w n w n n n', '/': 'n w n w n n n w n',
  '+': 'n w n n n w n w n', '%': 'n n n w n w n w n'
};

const Barcode39: React.FC<{ value: string; height?: number }> = ({ value, height = 45 }) => {
  const formatted = `*${value.toUpperCase()}*`;
  let x = 15; // Left margin
  const rects: React.ReactNode[] = [];

  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) continue;

    const steps = pattern.split(' ');
    for (let j = 0; j < steps.length; j++) {
      const isBar = j % 2 === 0;
      const isWide = steps[j] === 'w';
      const width = isWide ? 3 : 1;

      if (isBar) {
        rects.push(
          <rect key={`${i}-${j}`} x={x} y={0} width={width} height={height} fill="#000000" />
        );
      }
      x += width;
    }
    x += 1; // Narrow space between characters
  }

  return (
    <div style={{ background: '#ffffff', padding: '10px 15px', borderRadius: '6px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
      <svg width={x + 15} height={height} style={{ display: 'block' }}>
        {rects}
      </svg>
      <div style={{ textAlign: 'center', color: '#000000', fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, marginTop: '4px', letterSpacing: '1px' }}>
        {value}
      </div>
    </div>
  );
};


// Web Audio API Sound Generator (Self-contained, offline-safe)
const playSound = (type: 'success' | 'error') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    if (type === 'success') {
      // Clear high double beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(950, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.08);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(1150, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.12);
      }, 120);
    } else {
      // Low buzz warning
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn("Sound generation failed or blocked by browser policy.", e);
  }
};

interface Panel {
  referencia: string;
  iD_OrdenProduccion: number;
  iD_OrdenCliente: number;
  orden: number;
  secuencia: number;
  sd: string;
  expr1: string;
  puesto: string;
  fechaSecuencia?: string;
  mano?: string;
  posicion?: string;
  requiereOrnamento?: boolean;
}

interface ValidationResult {
  id_Validacion: number;
  id_Operacion: string;
  iD_OrdenProduccion: number;
  iD_OrdenCliente: number;
  orden: number;
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
  fechaAvancePuntero: string | null;
}

interface PriorUse {
  fecha: string;
  puesto: string;
  panel: string;
  ordenProduccion: number;
  operador: string;
}

interface OperativeViewProps {
  apiBaseUrl: string;
  puesto: string;
  refreshIntervalSec: number;
  operador: string;
  onOpenConfig: () => void;
  mockDbError: boolean;
  setMockDbError: (val: boolean) => void;
  mockPrintFolderError: boolean;
  setMockPrintFolderError: (val: boolean) => void;
  showQrSimulator: boolean;
}

export const OperativeView: React.FC<OperativeViewProps> = ({
  apiBaseUrl,
  puesto,
  refreshIntervalSec,
  operador,
  onOpenConfig,
  mockDbError,
  setMockDbError,
  mockPrintFolderError,
  setMockPrintFolderError,
  showQrSimulator
}) => {
  // Sequence State
  const [currentPanel, setCurrentPanel] = useState<Panel | null>(null);
  const [isLoadingPanel, setIsLoadingPanel] = useState(false);
  const [noPanelsMessage, setNoPanelsMessage] = useState('');
  
  // Validation Process States
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedQr, setLastScannedQr] = useState<string>('');
  const [showQrForSeconds, setShowQrForSeconds] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [duplicateUseDetails, setDuplicateUseDetails] = useState<PriorUse | null>(null);
  const [labelPreview, setLabelPreview] = useState<string | null>(null);
  const [remainingMinText, setRemainingMinText] = useState<string>('');

  // Hardware Status Indicators
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [printerOnline, setPrinterOnline] = useState<boolean | null>(null);
  const scannerActive = true;

  // Footer Alert Bar configuration
  const [footerState, setFooterState] = useState<'waiting' | 'processing' | 'approved' | 'rejected' | 'error' | 'idle'>('idle');
  const [footerText, setFooterText] = useState('INICIANDO PUESTO...');
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());

  // Simulator Drawer State
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simQrInput, setSimQrInput] = useState('');

  // Keep ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Main Polling effect to fetch the next panel
  useEffect(() => {
    let active = true;

    const fetchNextPanel = async () => {
      if (isProcessing) return;
      setIsLoadingPanel(true);
      try {
        const response = await fetch(`${apiBaseUrl}/api/sequence/next?puesto=${puesto}`);
        setDbConnected(true);
        if (!active) return;
        
        if (response.ok) {
          const data = await response.json();
          
          // Normalize backend properties to standard camelCase HMI model
          const normalizedData: Panel = {
            referencia: data.referencia || data.Referencia || '',
            iD_OrdenProduccion: data.iD_OrdenProduccion !== undefined ? data.iD_OrdenProduccion : (data.ID_OrdenProduccion !== undefined ? data.ID_OrdenProduccion : 0),
            iD_OrdenCliente: data.iD_OrdenCliente !== undefined ? data.iD_OrdenCliente : (data.ID_OrdenCliente !== undefined ? data.ID_OrdenCliente : 0),
            orden: data.orden !== undefined ? data.orden : (data.Orden !== undefined ? data.Orden : 0),
            secuencia: data.secuencia !== undefined ? data.secuencia : (data.Secuencia !== undefined ? data.Secuencia : 0),
            sd: data.sd || data.SD || '',
            expr1: data.expr1 || data.Expr1 || '',
            puesto: data.puesto || data.Puesto || '',
            fechaSecuencia: data.fechaSecuencia || data.FechaSecuencia,
            mano: data.mano || data.Mano || '',
            posicion: data.posicion || data.Posicion || '',
            requiereOrnamento: data.requiereOrnamento !== undefined ? data.requiereOrnamento : (data.RequiereOrnamento !== undefined ? data.RequiereOrnamento : true)
          };

          setCurrentPanel(normalizedData);
          setNoPanelsMessage('');
          
          // Update visual footer to waiting for scan or no ornament
          const responseEquiv = await fetch(`${apiBaseUrl}/api/equivalence`);
          const equivalences = await responseEquiv.json();
          const match = equivalences.find((e: any) => e.codigoPanel.toUpperCase().trim() === normalizedData.referencia.toUpperCase().trim() && e.activo);
          
          if (!match) {
            setFooterState('error');
            setFooterText('PANEL SIN EQUIVALENCIA CONFIGURADA');
          } else if (!match.requiereOrnamento) {
            setFooterState('waiting');
            setFooterText('ESTE PANEL NO LLEVA ORNAMENTO');
          } else {
            setFooterState('waiting');
            setFooterText('ESPERANDO LECTURA DE QR');
          }
        } else if (response.status === 404) {
          setCurrentPanel(null);
          const errData = await response.json();
          setNoPanelsMessage(errData.message || `SIN PANELES PENDIENTES PARA EL PUESTO ${puesto.toUpperCase()}`);
          setFooterState('idle');
          setFooterText(`SIN PANELES PENDIENTES PARA EL PUESTO ${puesto.toUpperCase()}`);
        } else {
          setDbConnected(false);
          setFooterState('error');
          setFooterText('SIN CONEXIÓN CON SQL SERVER');
        }
      } catch (err) {
        console.error("DB Fetch Error", err);
        setDbConnected(false);
        if (active) {
          setCurrentPanel(null);
          setFooterState('error');
          setFooterText('SIN CONEXIÓN CON SQL SERVER');
        }
      } finally {
        if (active) {
          setIsLoadingPanel(false);
        }
      }
    };

    fetchNextPanel(); // run instantly

    const polling = setInterval(fetchNextPanel, refreshIntervalSec * 1000);
    return () => {
      active = false;
      clearInterval(polling);
    };
  }, [puesto, refreshIntervalSec, isProcessing]);

  // Fetch installed printer status to make sure local printing service is alive
  useEffect(() => {
    const checkPrinter = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/print/printers`);
        if (res.ok) {
          const list = await res.json();
          setPrinterOnline(list.length > 0);
        } else {
          setPrinterOnline(false);
        }
      } catch {
        setPrinterOnline(false);
      }
    };
    checkPrinter();
  }, [apiBaseUrl]);

  // Capture barcode wedge (globally)
  useEffect(() => {
    let rawBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently focused inside active config page input text area
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      if (!currentPanel || isProcessing) return;

      const currentTime = Date.now();
      // Wedge readers send characters extremely rapidly (under 30ms apart)
      if (currentTime - lastKeyTime > 200) {
        rawBuffer = ''; // reset buffer if slow keypress
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (rawBuffer.trim().length > 0) {
          handleQrScan(rawBuffer.trim());
          rawBuffer = '';
        }
      } else if (e.key.length === 1) {
        rawBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentPanel, isProcessing, validationResult]);

  // Core scan processing logic
  const handleQrScan = async (qrCode: string) => {
    if (!currentPanel || isProcessing) return;

    // Normalizing QR
    const normalizedQr = qrCode.trim().replace(/\r?\n|\r/g, "");

    // Intercept control commands scanned via barcode gun
    const command = normalizedQr.toUpperCase();
    if (command === 'CMD-NO-ORN') {
      if (currentPanel.requiereOrnamento === false && !isProcessing && !validationResult) {
        handleConfirmNoOrnament();
      }
      return;
    }
    if (command === 'CMD-RETRY') {
      if (validationResult && validationResult.resultadoGeneral === 'APROBADO' && validationResult.estadoImpresion === 'COMPLETO' && !validationResult.fechaAvancePuntero && !isProcessing) {
        handleRetryDatabaseAdvance();
      }
      return;
    }
    if (command === 'CMD-RESET') {
      if (validationResult && validationResult.resultadoGeneral === 'RECHAZADO') {
        handleResetForNewScan();
      }
      return;
    }

    setLastScannedQr(normalizedQr);
    setShowQrForSeconds(true);
    setTimeout(() => setShowQrForSeconds(false), 5000);

    setIsProcessing(true);
    setFooterState('processing');
    setFooterText('PROCESANDO CÓDIGO QR...');

    // Clear prior states
    setValidationResult(null);
    setDuplicateUseDetails(null);
    setLabelPreview(null);
    setRemainingMinText('');

    // Prepare headers to simulate printer/db failures if checked in simulator
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json'
    };

    try {
      // API call to validate QR scan
      const res = await fetch(`${apiBaseUrl}/api/validation/validate-scan`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          qr: normalizedQr,
          panelReference: currentPanel.referencia,
          iD_OrdenProduccion: mockDbError ? 0 : currentPanel.iD_OrdenProduccion, // force invalid ID to fail DB save if mockDbError checked
          iD_OrdenCliente: currentPanel.iD_OrdenCliente,
          orden: currentPanel.orden,
          secuencia: currentPanel.secuencia,
          sd: currentPanel.sd,
          expr1: currentPanel.expr1,
          puesto: puesto,
          operador: operador
        })
      });

      if (res.ok) {
        const result = await res.json();
        
        // If simulation of printer failure is active
        if (mockPrintFolderError && result.success) {
          setFooterState('error');
          setFooterText('ERROR DE IMPRESIÓN');
          playSound('error');
          setIsProcessing(false);
          return;
        }

        setValidationResult(result.validation);
        if (result.preview) {
          setLabelPreview(result.preview);
        }

        if (result.success) {
          setFooterState('approved');
          setFooterText('PROCESO COMPLETADO');
          playSound('success');
          
          // Show visual confirmation for 4 seconds then transition next
          setTimeout(() => {
            setValidationResult(null);
            setLabelPreview(null);
            setIsProcessing(false);
          }, 4000);

        } else {
          // Failure handling
          playSound('error');
          if (result.validation.motivoRechazo === 'ORNAMENTO YA PROCESADO') {
            setFooterState('rejected');
            setFooterText('ORNAMENTO YA PROCESADO');
            if (result.priorUse) {
              setDuplicateUseDetails(result.priorUse);
            }
          } else if (result.validation.resultadoCorrespondencia === 'ORNAMENTO INCORRECTO') {
            setFooterState('rejected');
            setFooterText('ORNAMENTO INCORRECTO');
          } else if (result.validation.resultadoCurado === 'CURADO INSUFICIENTE') {
            setFooterState('rejected');
            const rem = result.remainingMinutes || 0;
            const hours = Math.floor(rem / 60);
            const mins = rem % 60;
            const remText = hours > 0 ? `RESTAN ${hours} H ${mins} MIN DE CURADO` : `RESTAN ${mins} MINUTOS DE CURADO`;
            setRemainingMinText(remText);
            setFooterText(remText);
          } else if (result.message === 'ERROR DE IMPRESIÓN' || result.validation.estadoImpresion === 'FALLIDO') {
            setFooterState('error');
            setFooterText('ERROR DE IMPRESIÓN');
          } else if (result.dbError) {
            // DB Save Failed but printed (Prueba 10 scenario)
            setFooterState('error');
            setFooterText('ERROR AL ACTUALIZAR SECUENCIA EN BASE DE DATOS');
          } else {
            setFooterState('rejected');
            setFooterText(result.validation.motivoRechazo || 'VALIDACIÓN RECHAZADA');
          }
          
          setIsProcessing(false);
        }
      } else {
        setFooterState('error');
        setFooterText('ERROR DE SERVIDOR AL VALIDAR');
        playSound('error');
        setIsProcessing(false);
      }
    } catch (e) {
      console.error(e);
      setFooterState('error');
      setFooterText('SIN CONEXIÓN CON SERVICIO DE VALIDACIÓN');
      playSound('error');
      setIsProcessing(false);
    }
  };

  // Confirm Panel Without Ornament (Case B)
  const handleConfirmNoOrnament = async () => {
    if (!currentPanel || isProcessing) return;

    setIsProcessing(true);
    setFooterState('processing');
    setFooterText('REGISTRANDO PANEL SIN ORNAMENTO...');
    
    setValidationResult(null);
    setLabelPreview(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/validation/confirm-no-ornament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelReference: currentPanel.referencia,
          iD_OrdenProduccion: mockDbError ? 0 : currentPanel.iD_OrdenProduccion,
          iD_OrdenCliente: currentPanel.iD_OrdenCliente,
          orden: currentPanel.orden,
          secuencia: currentPanel.secuencia,
          sd: currentPanel.sd,
          expr1: currentPanel.expr1,
          puesto: puesto,
          operador: operador
        })
      });

      if (res.ok) {
        const result = await res.json();
        
        if (mockPrintFolderError && result.success) {
          setFooterState('error');
          setFooterText('ERROR DE IMPRESIÓN');
          playSound('error');
          setIsProcessing(false);
          return;
        }

        setValidationResult(result.validation);
        if (result.preview) setLabelPreview(result.preview);

        if (result.success) {
          setFooterState('approved');
          setFooterText('PROCESO COMPLETADO');
          playSound('success');

          setTimeout(() => {
            setValidationResult(null);
            setLabelPreview(null);
            setIsProcessing(false);
          }, 4000);
        } else {
          playSound('error');
          if (result.message === 'ERROR DE IMPRESIÓN') {
            setFooterState('error');
            setFooterText('ERROR DE IMPRESIÓN');
          } else if (result.dbError) {
            setFooterState('error');
            setFooterText('ERROR AL ACTUALIZAR SECUENCIA EN BASE DE DATOS');
          } else {
            setFooterState('rejected');
            setFooterText(result.validation.motivoRechazo || 'CONFIRMACIÓN FALLIDA');
          }
          setIsProcessing(false);
        }
      } else {
        setFooterState('error');
        setFooterText('ERROR DE CONEXIÓN CON EL SERVIDOR');
        playSound('error');
        setIsProcessing(false);
      }
    } catch (e) {
      console.error(e);
      setFooterState('error');
      setFooterText('FALLO AL PROCESAR SOLICITUD');
      playSound('error');
      setIsProcessing(false);
    }
  };

  // Retry DB Pointer Advance (Prueba 10 scenario)
  const handleRetryDatabaseAdvance = async () => {
    if (!validationResult) return;
    setIsProcessing(true);
    setFooterState('processing');
    setFooterText('REINTENTANDO AVANCE DE SECUENCIA...');

    try {
      const res = await fetch(`${apiBaseUrl}/api/validation/retry-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iD_Validacion: validationResult.id_Validacion,
          iD_OrdenProduccion: currentPanel?.iD_OrdenProduccion || validationResult.iD_OrdenProduccion,
          iD_OrdenCliente: validationResult.iD_OrdenCliente,
          puesto: puesto,
          orden: validationResult.orden
        })
      });

      if (res.ok) {
        setFooterState('approved');
        setFooterText('PROCESO COMPLETADO');
        playSound('success');
        
        setTimeout(() => {
          setValidationResult(null);
          setLabelPreview(null);
          setIsProcessing(false);
        }, 3000);
      } else {
        setFooterState('error');
        setFooterText('REINTENTO FALLIDO EN BASE DE DATOS');
        playSound('error');
        setIsProcessing(false);
      }
    } catch {
      setFooterState('error');
      setFooterText('FALLA DE RED AL REINTENTAR');
      playSound('error');
      setIsProcessing(false);
    }
  };

  // Reset screen state to let operator retry scanning
  const handleResetForNewScan = () => {
    setValidationResult(null);
    setDuplicateUseDetails(null);
    setLabelPreview(null);
    setRemainingMinText('');
    setFooterState('waiting');
    setFooterText(currentPanel && currentPanel.requiereOrnamento === false ? 'ESTE PANEL NO LLEVA ORNAMENTO' : 'ESPERANDO LECTURA DE QR');
  };

  // UI State Background Color Class mapping
  const getFooterBgClass = () => {
    switch (footerState) {
      case 'waiting': return 'bg-state-waiting';
      case 'processing': return 'bg-state-processing pulse';
      case 'approved': return 'bg-state-approved';
      case 'rejected': return 'bg-state-rejected';
      case 'error': return 'bg-state-error';
      case 'idle': return 'bg-state-idle';
      default: return 'bg-state-idle';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', boxSizing: 'border-box', position: 'relative' }}>
      
      {/* HEADER SECTION */}
      <header className="card-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 16px 8px 16px', padding: '12px 24px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Cpu size={28} className="pulse" style={{ color: 'var(--accent-color)' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>DL01 - ENSAMBLE DE ORNAMENTO</h1>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>INDUSTRIAL QR MATCHING SYSTEM</span>
          </div>
        </div>

        {/* Live statuses */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Database size={16} style={{ color: dbConnected ? '#10b981' : '#ef4444' }} />
            <span>DB: {dbConnected ? 'CONECTADA' : 'DESCONECTADA'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Printer size={16} style={{ color: printerOnline ? '#10b981' : '#f59e0b' }} />
            <span>IMPRESORA: {printerOnline ? 'ONLINE' : 'FALLA/PREVIEW'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Volume2 size={16} style={{ color: '#10b981' }} />
            <span>AUDIO: OK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
            <User size={18} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>{operador}</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-color)', width: '90px', textAlign: 'right' }}>
            {timeStr}
          </div>
          <button className="btn btn-secondary" onClick={onOpenConfig} style={{ padding: '8px 16px', fontSize: '13px' }}>
            CONFIGURACIÓN
          </button>
        </div>
      </header>

      {/* MAIN CORE PANELS */}
      <main style={{ display: 'flex', flex: 1, gap: '16px', padding: '8px 16px', overflow: 'hidden' }}>
        
        {/* LEFT PANEL: Requested Panel Sequence */}
        <section className="card-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Panel Solicitado</h2>
              <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-color)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                SECUENCIA ACTIVA
              </span>
            </div>

            {currentPanel ? (
              <div className="slide-up">
                {/* 1. Código de Panel */}
                <div style={{ marginBottom: '20px', borderBottom: '1px dashed rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Código Panel de Planta
                  </span>
                  <strong style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
                    {currentPanel.referencia}
                  </strong>
                </div>

                {/* 2. GRANDES (SD, Secuencia, Fecha) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  
                  {/* Fila superior: SD y Secuencia al lado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* SD en grande */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
                        SD (Modelo)
                      </span>
                      <strong style={{ fontSize: '42px', fontWeight: 900, color: '#10b981', display: 'block', lineHeight: 1 }}>
                        {currentPanel.sd || 'N/A'}
                      </strong>
                    </div>

                    {/* Secuencia en grande */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Nro. Secuencia
                      </span>
                      <strong style={{ fontSize: '42px', fontWeight: 900, color: 'var(--accent-color)', display: 'block', lineHeight: 1 }}>
                        {currentPanel.secuencia}
                      </strong>
                    </div>
                  </div>

                  {/* Fila: Fecha Secuencia en grande */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Fecha de Secuencia
                    </span>
                    <strong style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', display: 'block', lineHeight: 1.1 }}>
                      {currentPanel.fechaSecuencia 
                        ? new Date(currentPanel.fechaSecuencia).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* 3. Datos Auxiliares Menores */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>ORDEN COLA:</span>
                    <strong style={{ fontSize: '14px', color: '#ffffff' }}>{currentPanel.orden}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>OP ID:</span>
                    <strong style={{ fontSize: '14px', color: '#ffffff' }}>{currentPanel.iD_OrdenProduccion}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>POSICIÓN:</span>
                    <strong style={{ fontSize: '14px', color: '#a855f7' }}>{currentPanel.posicion || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>MANO:</span>
                    <strong style={{ fontSize: '14px', color: '#ec4899' }}>{currentPanel.mano || 'N/A'}</strong>
                  </div>
                </div>


              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-secondary)' }}>
                {isLoadingPanel ? (
                  <>
                    <RefreshCw className="pulse" size={48} style={{ marginBottom: '16px', color: 'var(--accent-color)' }} />
                    <span>CONSULTANDO SECUENCIA SQL...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={48} style={{ marginBottom: '16px', color: '#6b7280' }} />
                    <span style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center' }}>
                      {noPanelsMessage || "SIN PANELES PENDIENTES"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Scanner Listening Indicator */}
          {currentPanel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '13px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: scannerActive ? '#10b981' : '#6b7280', animation: scannerActive ? 'pulse 1.5s infinite' : 'none' }}></span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {isProcessing ? 'Lector Bloqueado mientras se procesa...' : 'Lector QR Activo (Espere disparo de pistola USB)'}
              </span>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Scanned Ornament Status */}
        <section className="card-panel" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Ornamento Escaneado</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>DETALLE DE TRAZABILIDAD</span>
            </div>

            {/* Display validation result or scanned state */}
            {validationResult ? (
              <div className="slide-up">
                
                {/* Result header banner */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  background: validationResult.resultadoGeneral === 'APROBADO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                  border: `1px solid ${validationResult.resultadoGeneral === 'APROBADO' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                  marginBottom: '20px'
                }}>
                  {validationResult.resultadoGeneral === 'APROBADO' ? (
                    <CheckCircle size={32} style={{ color: '#10b981' }} />
                  ) : (
                    <XCircle size={32} style={{ color: '#dc2626' }} />
                  )}
                  <div>
                    <strong style={{ fontSize: '18px', display: 'block', color: validationResult.resultadoGeneral === 'APROBADO' ? '#10b981' : '#ef4444' }}>
                      {validationResult.resultadoGeneral === 'APROBADO' ? 'VALIDACIÓN APROBADA' : 'VALIDACIÓN RECHAZADA'}
                    </strong>
                    <span style={{ fontSize: '13px' }}>
                      {validationResult.resultadoGeneral === 'APROBADO' 
                        ? 'Kanban enviado a impresión correctamente.' 
                        : (validationResult.motivoRechazo || 'Código no correspondiente')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>ORNAMENTO ESPERADO:</span>
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>{validationResult.codigoOrnamentoEsperado || 'NINGUNO'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>ORNAMENTO LEÍDO:</span>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: validationResult.resultadoCorrespondencia === 'ORNAMENTO INCORRECTO' ? '#ef4444' : '#10b981' }}>
                      {validationResult.codigoOrnamentoLeido || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>INICIO DE CURADO:</span>
                    <div>{validationResult.inicioCurado ? new Date(validationResult.inicioCurado).toLocaleString() : 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>DURACIÓN DE CURADO:</span>
                    <div style={{ fontWeight: 700, color: validationResult.resultadoCurado === 'CURADO INSUFICIENTE' ? '#ef4444' : '#10b981' }}>
                      {validationResult.minutosCurado != null ? `${Math.floor(validationResult.minutosCurado / 60)} h ${validationResult.minutosCurado % 60} min` : 'N/A'}
                    </div>
                    {remainingMinText && validationResult.resultadoCurado === 'CURADO INSUFICIENTE' && (
                      <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                        ({remainingMinText})
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>QR ORIGINAL:</span>
                    <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '4px', wordBreak: 'break-all', display: 'block' }}>
                      {validationResult.qrCompleto}
                    </code>
                  </div>
                </div>

                {/* Duplicate Details Drawer */}
                {duplicateUseDetails && (
                  <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>DETALLES DE UTILIZACIÓN ANTERIOR:</div>
                    <div><strong>Fecha:</strong> {new Date(duplicateUseDetails.fecha).toLocaleString()}</div>
                    <div><strong>Puesto:</strong> {duplicateUseDetails.puesto} | <strong>Operador:</strong> {duplicateUseDetails.operador}</div>
                    <div><strong>Panel:</strong> {duplicateUseDetails.panel} | <strong>Orden ID:</strong> {duplicateUseDetails.ordenProduccion}</div>
                  </div>
                )}

                {/* DB pointer advance failure action (Prueba 10 retry) */}
                {validationResult.resultadoGeneral === 'APROBADO' && validationResult.estadoImpresion === 'COMPLETO' && !validationResult.fechaAvancePuntero && (
                  <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c', fontWeight: 700, marginBottom: '8px', textAlign: 'left' }}>
                      <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                      <span>FALLÓ AVANCE DE TRANSACCIÓN EN SQL SERVER</span>
                    </div>
                    <p style={{ fontSize: '12px', margin: '0 0 12px 0', textAlign: 'left', color: 'var(--text-secondary)' }}>El Kanban fue impreso, pero el puntero no pudo actualizarse. Escanea o presiona reintentar para avanzar la secuencia.</p>
                    <button className="btn btn-primary" onClick={handleRetryDatabaseAdvance} style={{ backgroundColor: '#ea580c', width: '100%', marginBottom: '16px' }}>
                      REINTENTAR ACTUALIZAR BASE DE DATOS
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>O ESCANEA CÓDIGO DE CONTROL:</span>
                      <Barcode39 value="CMD-RETRY" />
                    </div>
                  </div>
                )}

                {/* Reset button for rejected scan */}
                {validationResult.resultadoGeneral === 'RECHAZADO' && (
                  <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button className="btn btn-secondary" onClick={handleResetForNewScan} style={{ width: '100%', padding: '16px', marginBottom: '16px' }}>
                      ACEPTAR Y LEER OTRO ORNAMENTO
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>O ESCANEA CÓDIGO DE CONTROL:</span>
                      <Barcode39 value="CMD-RESET" />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', color: 'var(--text-secondary)' }}>
                {isProcessing ? (
                  <>
                    <RefreshCw className="pulse" size={48} style={{ marginBottom: '16px', color: 'var(--accent-color)' }} />
                    <span>PROCESANDO ANÁLISIS DE BARCODE...</span>
                  </>
                ) : (currentPanel && currentPanel.requiereOrnamento === false) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                      <AlertTriangle size={36} className="pulse" />
                      <strong style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1px' }}>CÓDIGO NO APLICA</strong>
                    </div>
                    <p style={{ fontSize: '13px', margin: '0 0 10px 0', maxWidth: '300px', lineHeight: '1.5', textAlign: 'center' }}>
                      Este panel se procesa <strong style={{ color: '#10b981' }}>SIN ORNAMENTO</strong>. Escanea el código de control abajo para imprimir Kanban y avanzar.
                    </p>
                    <Barcode39 value="CMD-NO-ORN" height={60} />
                    <button className="btn btn-primary btn-large" onClick={handleConfirmNoOrnament} style={{ backgroundColor: '#10b981', width: '80%', padding: '12px 0', marginTop: '10px' }}>
                      CONFIRMAR PANEL SIN ORNAMENTO
                    </button>
                  </div>
                ) : (
                  <>
                    <HelpCircle size={48} style={{ marginBottom: '16px', color: '#4b5563' }} />
                    <span>NINGÚN DISPARO DETECTADO AÚN</span>
                    <span style={{ fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>Aproxime el ornamento a la pistola QR</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* QR Scan Toast Popup */}
          {showQrForSeconds && lastScannedQr && (
            <div className="slide-up" style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '11px', marginTop: '10px' }}>
              <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>QR LEÍDO: </span>
              <code style={{ wordBreak: 'break-all' }}>{lastScannedQr}</code>
            </div>
          )}
        </section>

        {/* FLOATING PREVIEW KANBAN COMPONENT */}
        {labelPreview && (
          <section className="card-panel" style={{ flex: 0.8, display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Kanban Impreso (Preview)</h3>
            <div style={{ border: '2px solid #555', background: '#fff', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`data:image/png;base64,${labelPreview}`} alt="Kanban label print preview" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
            </div>
          </section>
        )}

      </main>

      {/* FOOTER BAR */}
      <footer className={getFooterBgClass()} style={{
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '2px', textShadow: '2px 2px 4px rgba(0,0,0,0.4)', textAlign: 'center', color: '#fff' }}>
          {footerText.toUpperCase()}
        </div>
      </footer>

      {/* SIMULATOR SLIDEOUT (For developer testing) */}
      {showQrSimulator && (
        <div className="card-panel" style={{
          position: 'absolute',
          top: simulatorOpen ? '100px' : 'calc(100vh - 50px)',
          right: '24px',
          width: '320px',
          zIndex: 100,
          backgroundColor: '#111827',
          border: '2px solid var(--accent-color)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
          padding: '16px',
          borderRadius: '8px',
          transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <strong style={{ color: 'var(--accent-color)', fontSize: '13px', letterSpacing: '1px' }}>🖥️ MODO SIMULADOR QR</strong>
            <button className="btn btn-secondary" onClick={() => setSimulatorOpen(!simulatorOpen)} style={{ padding: '4px 8px', fontSize: '11px' }}>
              {simulatorOpen ? 'OCULTAR' : 'MOSTRAR'}
            </button>
          </div>

          {simulatorOpen && (
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Pegue o simule lecturas de códigos QR aquí. El formato por defecto del seed es:
                <br/><code style={{ background: '#222', color: '#10b981', display: 'block', padding: '4px', margin: '4px 0', borderRadius: '3px' }}>CÓDIGO_ORNAMENTO;FECHA_CURADO;SERIAL</code>
              </p>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Pegar código QR de prueba:</label>
                <textarea 
                  className="form-input" 
                  rows={2} 
                  value={simQrInput}
                  onChange={(e) => setSimQrInput(e.target.value)}
                  placeholder="67781-0K090;202607170600;SN998822"
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => { if(simQrInput) handleQrScan(simQrInput); }} 
                  disabled={!currentPanel || isProcessing}
                  style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                >
                  Disparar Escaneo
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSimQrInput('')} 
                  style={{ fontSize: '12px', padding: '8px' }}
                >
                  Borrar
                </button>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <strong style={{ fontSize: '11px', display: 'block', marginBottom: '6px', color: '#ea580c' }}>Simular errores de Planta:</strong>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <input 
                    type="checkbox" 
                    id="chkPrintErr" 
                    checked={mockPrintFolderError} 
                    onChange={(e) => setMockPrintFolderError(e.target.checked)} 
                  />
                  <label htmlFor="chkPrintErr" style={{ fontSize: '11px', cursor: 'pointer' }}>Error de Impresora (Prueba 9)</label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="chkDbErr" 
                    checked={mockDbError} 
                    onChange={(e) => setMockDbError(e.target.checked)} 
                  />
                  <label htmlFor="chkDbErr" style={{ fontSize: '11px', cursor: 'pointer' }}>Fallo de Base de Datos (Prueba 10)</label>
                </div>
              </div>
              
              {/* Quick Helper seeds list */}
              {currentPanel && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '10px' }}>
                  <strong style={{ fontSize: '10px', display: 'block', marginBottom: '4px', color: 'var(--text-secondary)' }}>QR válidos según el panel solicitado:</strong>
                  
                  {currentPanel.referencia === '67610-0KM60-C0' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '4px', justifyContent: 'flex-start' }} onClick={() => setSimQrInput("67781-0K090;202607170600;SN123456")}>
                        ✔️ OK (Curado 4h 10m - Prueba 1)
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '4px', justifyContent: 'flex-start' }} onClick={() => setSimQrInput("67782-0K090;202607170600;SN123456")}>
                        ❌ ERROR (Ornamento incorrecto - Prueba 2)
                      </button>
                    </div>
                  )}

                  {currentPanel.referencia === '67610-0KM70-C0' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '4px', justifyContent: 'flex-start' }} onClick={() => setSimQrInput("67781-0K100;202607170611;SN123456")}>
                        ❌ CURADO INSUFICIENTE (3h 59m - Prueba 3)
                      </button>
                      <button className="btn btn-secondary" style={{ fontSize: '10px', padding: '4px', justifyContent: 'flex-start' }} onClick={() => setSimQrInput("67781-0K100;202607170610;SN123456")}>
                        ✔️ CURADO OK (4h 00m - Prueba 4)
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
};
