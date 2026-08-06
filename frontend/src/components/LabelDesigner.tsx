import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Printer, RefreshCw, Layers, Sparkles, 
  CheckCircle2, AlertTriangle, Trash2, Move, Type, Square, Maximize2 
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

interface VisualElement {
  id: string;
  type: 'text' | 'barcode' | 'qrcode' | 'box' | 'line';
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;      // static text or variable placeholders like {Referencia}
  fontSize?: number;    // ZPL font height size
  thickness?: number;   // Box or line border thickness
  qrScale?: number;     // QR scale (1-10)
}

export const LabelDesigner: React.FC<LabelDesignerProps> = ({ apiBaseUrl, onClose, onConfigUpdated }) => {
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [zplCode, setZplCode] = useState('');
  const [originalZpl, setOriginalZpl] = useState('');
  const [visualElements, setVisualElements] = useState<VisualElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Canvas settings
  const [useGrid, setUseGrid] = useState(true);
  const [showSimulatedValues, setShowSimulatedValues] = useState(true);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });

  // Preview & printers state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [printStatus, setPrintStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Simulated values state
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
  const canvasRef = useRef<HTMLDivElement>(null);

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
        // Parse raw ZPL into visual elements initially
        const elements = parseZplToElements(template);
        setVisualElements(elements);
        fetchPreview(template, simData);
      }
    } catch (e) {
      console.warn("Error cargando plantilla inicial. Usando preset estándar.", e);
      setZplCode(presets.standard);
      const elements = parseZplToElements(presets.standard);
      setVisualElements(elements);
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

  // PARSER: ZPL String -> VisualElement[]
  const parseZplToElements = (zpl: string): VisualElement[] => {
    const elements: VisualElement[] = [];
    if (!zpl) return elements;

    // Split ZPL by commands (starts with ^ or ~)
    const commands = zpl.split(/(?=\^|~)/);
    
    let currentFontSize = 24;
    let currentX = 0;
    let currentY = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i].trim();
      if (!cmd) continue;

      // 1. Check Global Font size default: ^CF0,24
      const cfMatch = cmd.match(/^\^CF0,(\d+)/i);
      if (cfMatch) {
        currentFontSize = parseInt(cfMatch[1]) || 24;
        continue;
      }

      // 2. Check position command: ^FOx,y
      const foMatch = cmd.match(/^\^FO(\d+),(\d+)/i);
      if (foMatch) {
        currentX = parseInt(foMatch[1]) || 0;
        currentY = parseInt(foMatch[2]) || 0;

        // Check if there are chained commands in the same segment or next segment
        // Let's merge standard chained parameters to scan inside this chunk
        let nextSegment = cmd;
        if (cmd === `^FO${currentX},${currentY}` && i + 1 < commands.length) {
          // If the segment is just the position, inspect next command
          nextSegment = commands[i + 1].trim();
        }

        // A. Graphic Box: ^GBw,h,t
        const gbMatch = nextSegment.match(/\^GB(\d+),(\d+),(\d+)/i);
        if (gbMatch) {
          const w = parseInt(gbMatch[1]) || 10;
          const h = parseInt(gbMatch[2]) || 10;
          const t = parseInt(gbMatch[3]) || 2;
          const isLine = (w <= 6 || h <= 6);
          elements.push({
            id: 'el_' + Math.random().toString(36).substr(2, 9),
            type: isLine ? 'line' : 'box',
            x: currentX,
            y: currentY,
            w,
            h,
            content: isLine ? 'Línea' : 'Caja',
            thickness: t
          });
          continue;
        }

        // B. 1D Barcode: ^BCN,h,Y...
        const bcMatch = nextSegment.match(/\^BC[A-Z0-9]?,(\d+)/i);
        if (bcMatch) {
          const h = parseInt(bcMatch[1]) || 60;
          // Look for subsequent FD command to capture barcode content
          let content = '';
          const fdMatch = nextSegment.match(/\^FD([^^]+)\^FS/i);
          if (fdMatch) {
            content = fdMatch[1];
          } else if (i + 1 < commands.length) {
            // check if FD is in the next block
            const fdNext = commands[i + 1].trim();
            const fdMatchNext = fdNext.match(/^\^FD([^^]+)\^FS/i);
            if (fdMatchNext) content = fdMatchNext[1];
          }

          elements.push({
            id: 'el_' + Math.random().toString(36).substr(2, 9),
            type: 'barcode',
            x: currentX,
            y: currentY,
            w: 240,
            h,
            content: content || '{Referencia}'
          });
          continue;
        }

        // C. QR Code: ^BQN,2,scale
        const bqMatch = nextSegment.match(/\^BQ[A-Z0-9]?,2,(\d+)/i);
        if (bqMatch) {
          const scale = parseInt(bqMatch[1]) || 5;
          let content = '';
          const fdMatch = nextSegment.match(/\^FDQA,([^^]+)\^FS/i);
          if (fdMatch) {
            content = fdMatch[1];
          } else if (i + 1 < commands.length) {
            const fdNext = commands[i + 1].trim();
            const fdMatchNext = fdNext.match(/^\^FDQA,([^^]+)\^FS/i);
            if (fdMatchNext) content = fdMatchNext[1];
          }

          elements.push({
            id: 'el_' + Math.random().toString(36).substr(2, 9),
            type: 'qrcode',
            x: currentX,
            y: currentY,
            w: scale * 25,
            h: scale * 25,
            content: content || '{QrCompleto}',
            qrScale: scale
          });
          continue;
        }

        // D. Text Field: ^FDtext^FS (optionally preceeded by font size ^A0,size,size)
        const aMatch = nextSegment.match(/\^A([A-Z0-9]),(\d+)/i);
        let size = currentFontSize;
        if (aMatch) {
          size = parseInt(aMatch[2]) || currentFontSize;
        }

        const fdMatch = nextSegment.match(/\^FD([^^]+)\^FS/i);
        if (fdMatch) {
          const content = fdMatch[1];
          elements.push({
            id: 'el_' + Math.random().toString(36).substr(2, 9),
            type: 'text',
            x: currentX,
            y: currentY,
            w: Math.max(80, content.length * (size * 0.55)),
            h: size + 6,
            content,
            fontSize: size
          });
        }
      }
    }

    return elements;
  };

  // GENERATOR: VisualElement[] -> ZPL String
  const generateZplFromElements = (elements: VisualElement[]): string => {
    let zpl = '^XA\n^LH30,20\n';
    
    // Sort elements visually by Y, then X to write neat ZPL
    const sorted = [...elements].sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    for (const el of sorted) {
      if (el.type === 'text') {
        const size = el.fontSize || 24;
        zpl += `^FO${el.x},${el.y}^A0,${size},${size}^FD${el.content}^FS\n`;
      } else if (el.type === 'barcode') {
        zpl += `^FO${el.x},${el.y}^BCN,${el.h},Y,N,N^FD${el.content}^FS\n`;
      } else if (el.type === 'qrcode') {
        const scale = el.qrScale || 5;
        zpl += `^FO${el.x},${el.y}^BQN,2,${scale}^FDQA,${el.content}^FS\n`;
      } else if (el.type === 'box') {
        zpl += `^FO${el.x},${el.y}^GB${el.w},${el.h},${el.thickness || 2}^FS\n`;
      } else if (el.type === 'line') {
        zpl += `^FO${el.x},${el.y}^GB${el.w},${el.h},${el.thickness || 2}^FS\n`;
      }
    }

    zpl += '^XZ';
    return zpl;
  };

  const fetchPreview = async (templateToRender: string, dataToUse: SimulatedData) => {
    if (!templateToRender) return;
    setIsLoadingPreview(true);
    setPreviewError(null);

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
      console.warn("Fallo de conexión. Intentando llamada directa a Labelary...", e);
      try {
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
          setPreviewError('Labelary offline.');
        }
      } catch {
        setPreviewError(`No se pudo conectar al HMI en ${apiBaseUrl}`);
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSimDataChange = (field: keyof SimulatedData, value: string | number) => {
    const updated = { ...simData, [field]: value };
    setSimData(updated);
    // Refresh preview based on current editor mode ZPL source
    if (editorMode === 'visual') {
      const generated = generateZplFromElements(visualElements);
      fetchPreview(generated, updated);
    } else {
      fetchPreview(zplCode, updated);
    }
  };

  const handleModeSwitch = (mode: 'visual' | 'code') => {
    if (mode === 'visual') {
      // Parse ZPL code text area to rebuild visual elements
      const parsed = parseZplToElements(zplCode);
      setVisualElements(parsed);
      setSelectedElementId(null);
    } else {
      // Generate ZPL code from visual elements
      const generated = generateZplFromElements(visualElements);
      setZplCode(generated);
    }
    setEditorMode(mode);
  };

  // DRAG AND DROP MOUSE EVENTS handlers
  const handleElementMouseDown = (e: React.MouseEvent, element: VisualElement) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(element.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: element.x, y: element.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || selectedElementId === null) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      let newX = elementStart.x + dx;
      let newY = elementStart.y + dy;

      // Snapping
      if (useGrid) {
        newX = Math.round(newX / 10) * 10;
        newY = Math.round(newY / 10) * 10;
      }

      // Keep within label boundaries (ZPL is standard 600 width, 450 height)
      newX = Math.max(0, Math.min(580, newX));
      newY = Math.max(0, Math.min(420, newY));

      setVisualElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          return { ...el, x: newX, y: newY };
        }
        return el;
      }));
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, elementStart, selectedElementId, useGrid]);

  // Visual template helper methods
  const addElement = (type: VisualElement['type']) => {
    const id = 'el_' + Math.random().toString(36).substr(2, 9);
    let newElement: VisualElement;

    switch (type) {
      case 'text':
        newElement = { id, type, x: 50, y: 50, w: 120, h: 30, content: 'Texto Nuevo', fontSize: 24 };
        break;
      case 'barcode':
        newElement = { id, type, x: 50, y: 150, w: 200, h: 60, content: '{Referencia}' };
        break;
      case 'qrcode':
        newElement = { id, type, x: 400, y: 250, w: 125, h: 125, content: '{QrCompleto}', qrScale: 5 };
        break;
      case 'box':
        newElement = { id, type, x: 10, y: 10, w: 560, h: 410, content: 'Caja', thickness: 4 };
        break;
      case 'line':
        newElement = { id, type, x: 10, y: 210, w: 560, h: 2, content: 'Línea', thickness: 2 };
        break;
    }

    setVisualElements(prev => [...prev, newElement]);
    setSelectedElementId(id);
  };

  const deleteElement = (id: string) => {
    setVisualElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const updateSelectedElement = (updates: Partial<VisualElement>) => {
    if (!selectedElementId) return;
    setVisualElements(prev => prev.map(el => {
      if (el.id === selectedElementId) {
        const merged = { ...el, ...updates } as VisualElement;
        // recalculate approximate width for visual representation if text changed
        if (merged.type === 'text' && (updates.content !== undefined || updates.fontSize !== undefined)) {
          const fontSize = merged.fontSize || 24;
          merged.w = Math.max(80, merged.content.length * (fontSize * 0.55));
          merged.h = fontSize + 6;
        }
        if (merged.type === 'qrcode' && updates.qrScale !== undefined) {
          const scale = merged.qrScale || 5;
          merged.w = scale * 25;
          merged.h = scale * 25;
        }
        return merged;
      }
      return el;
    }));
  };

  // Get current active ZPL code (either compiled from visual model or current text edit)
  const getActiveZpl = () => {
    if (editorMode === 'visual') {
      return generateZplFromElements(visualElements);
    }
    return zplCode;
  };

  const handleSaveTemplate = async () => {
    setSaveStatus({ type: null, message: '' });
    const targetZpl = getActiveZpl();
    try {
      const res = await fetch(`${apiBaseUrl}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'Printer_Zpl_Template',
          value: targetZpl,
          user: 'ADMIN_DISEÑO',
          motivo: 'Rediseño de etiqueta Kanban desde Diseñador Drag & Drop'
        })
      });

      if (res.ok) {
        setOriginalZpl(targetZpl);
        setZplCode(targetZpl);
        setSaveStatus({ type: 'success', message: '¡Diseño guardado correctamente en la base de datos!' });
        onConfigUpdated();
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveStatus({ type: 'error', message: err.message || 'Error al guardar el diseño.' });
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
    setPrintStatus({ type: null, message: 'Preparando e imprimiendo...' });

    const targetZpl = getActiveZpl();
    try {
      // Save temporarily to run print job
      const saveOk = await fetch(`${apiBaseUrl}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'Printer_Zpl_Template',
          value: targetZpl,
          user: 'ADMIN_DISEÑO',
          motivo: 'Impresión de prueba temporal'
        })
      });

      if (!saveOk.ok) {
        setPrintStatus({ type: 'error', message: 'No se pudo guardar la plantilla para la prueba.' });
        return;
      }

      setOriginalZpl(targetZpl);
      setZplCode(targetZpl);
      onConfigUpdated();

      const res = await fetch(
        `${apiBaseUrl}/api/print/test?printerName=${encodeURIComponent(selectedPrinter)}&panelCode=${encodeURIComponent(simData.referencia)}`,
        { method: 'POST' }
      );

      if (res.ok) {
        setPrintStatus({ type: 'success', message: '¡Etiqueta física enviada a ' + selectedPrinter + '!' });
        setTimeout(() => setPrintStatus({ type: null, message: '' }), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setPrintStatus({ type: 'error', message: err.detail || err.message || 'Error de cola de impresión.' });
      }
    } catch (e: any) {
      setPrintStatus({ type: 'error', message: `Fallo de red: ${e.message}` });
    }
  };

  const loadPreset = (presetKey: keyof typeof presets) => {
    if (window.confirm('¿Desea cargar esta plantilla predefinida? Se perderán las modificaciones no guardadas.')) {
      const selected = presets[presetKey];
      setZplCode(selected);
      if (editorMode === 'visual') {
        setVisualElements(parseZplToElements(selected));
        setSelectedElementId(null);
      }
      fetchPreview(selected, simData);
    }
  };

  const insertVariableInCodeEditor = (variable: string) => {
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

  // Helper function to resolve variable bindings visually on canvas
  const getSimulatedText = (rawContent: string) => {
    if (!showSimulatedValues) return rawContent;
    let text = rawContent;
    text = text.replace(/{Puesto}/g, simData.puesto);
    text = text.replace(/{Referencia}/g, simData.referencia);
    text = text.replace(/{Ornamento}/g, simData.codigoOrnamentoLeido);
    text = text.replace(/{OrdenProduccion}/g, simData.id_OrdenProduccion.toString());
    text = text.replace(/{OrdenCliente}/g, simData.id_OrdenCliente.toString());
    text = text.replace(/{Secuencia}/g, simData.secuencia.toString());
    text = text.replace(/{SD}/g, simData.sd);
    text = text.replace(/{Mano}/g, simData.mano);
    text = text.replace(/{MinutosCurado}/g, simData.minutosCurado.toString() + ' min');
    text = text.replace(/{QrCompleto}/g, simData.qrCompleto);
    text = text.replace(/{FechaLectura}/g, new Date().toLocaleDateString());
    return text;
  };

  const getSelectedElement = () => {
    return visualElements.find(el => el.id === selectedElementId) || null;
  };

  const selectedElement = getSelectedElement();

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
      
      {/* HEADER BAR */}
      <header style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#0a0d16',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6'
          }}>
            <Layers size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Diseñador Visual de Etiquetas ZPL</h1>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
              Cree plantillas Zebra de forma visual mediante Drag & Drop.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: '#000',
          padding: '2px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <button 
            onClick={() => handleModeSwitch('visual')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: editorMode === 'visual' ? '#3b82f6' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s'
            }}
          >
            Diseño Visual (Lienzo)
          </button>
          <button 
            onClick={() => handleModeSwitch('code')}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: editorMode === 'code' ? '#3b82f6' : 'transparent',
              color: '#fff',
              transition: 'all 0.2s'
            }}
          >
            Código ZPL (Raw)
          </button>
        </div>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
            Cerrar Diseñador
          </button>
          
          <button 
            onClick={handleSaveTemplate} 
            disabled={getActiveZpl() === originalZpl}
            className="btn btn-primary" 
            style={{ 
              padding: '6px 14px', 
              fontSize: '13px',
              opacity: getActiveZpl() === originalZpl ? 0.6 : 1,
              cursor: getActiveZpl() === originalZpl ? 'default' : 'pointer'
            }}
          >
            <Save size={14} />
            Guardar Diseño
          </button>
        </div>
      </header>

      {/* VIEWPORT AREA */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: LIENZO (VISUAL) O TEXTAREA (CODE) */}
        <div style={{
          flex: '1.4',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#0c0f19'
        }}>
          
          {/* Subheader: Presets */}
          <div style={{
            padding: '10px 16px',
            backgroundColor: '#0a0d16',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Presets:</span>
              {['standard', 'detailedQr', 'compact'].map(p => (
                <button 
                  key={p} 
                  onClick={() => loadPreset(p as any)} 
                  className="btn btn-secondary" 
                  style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px' }}
                >
                  {p === 'standard' ? 'Estándar' : p === 'detailedQr' ? 'QR Detallado' : 'Compacto'}
                </button>
              ))}
            </div>

            {editorMode === 'visual' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={useGrid} onChange={(e) => setUseGrid(e.target.checked)} />
                  Ajustar a Rejilla (10px)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showSimulatedValues} onChange={(e) => setShowSimulatedValues(e.target.checked)} />
                  Ver Valores Simulados
                </label>
              </div>
            )}
          </div>

          {/* VISUAL LIENZO MODE */}
          {editorMode === 'visual' && (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '20px',
              overflow: 'auto',
              position: 'relative'
            }}>
              {/* Element Add Toolbox (Barra de herramientas flotante arriba) */}
              <div style={{
                position: 'absolute',
                top: '16px',
                display: 'flex',
                backgroundColor: 'rgba(10, 13, 22, 0.95)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '4px',
                gap: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                zIndex: 10
              }}>
                <button onClick={() => addElement('text')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Type size={12} /> +Texto
                </button>
                <button onClick={() => addElement('barcode')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Move size={12} /> +Barras 1D
                </button>
                <button onClick={() => addElement('qrcode')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Maximize2 size={12} /> +QR 2D
                </button>
                <button onClick={() => addElement('box')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Square size={12} /> +Borde/Caja
                </button>
                <button onClick={() => addElement('line')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Maximize2 size={12} /> +Línea
                </button>
              </div>

              {/* CANVA WRAPPER CARD */}
              <div 
                ref={canvasRef}
                style={{
                  width: '600px',
                  height: '450px',
                  backgroundColor: '#ffffff',
                  position: 'relative',
                  boxShadow: '0 15px 40px rgba(0,0,0,0.7)',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundImage: useGrid ? 'radial-gradient(circle, #ddd 1px, transparent 1px)' : 'none',
                  backgroundSize: '10px 10px',
                  userSelect: 'none',
                  overflow: 'hidden'
                }}
                onClick={() => setSelectedElementId(null)}
              >
                {/* Visual rendering of elements */}
                {visualElements.map(el => {
                  const isSelected = selectedElementId === el.id;
                  
                  // Render styles dynamically depending on type
                  let innerNode: React.ReactNode;
                  let elementStyle: React.CSSProperties = {
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.w}px`,
                    height: `${el.h}px`,
                    boxSizing: 'border-box',
                    cursor: 'move',
                    display: 'flex',
                    alignItems: 'center',
                    border: isSelected ? '2px solid #2563eb' : '1px dashed transparent',
                    boxShadow: isSelected ? '0 0 10px rgba(37,99,235,0.4)' : 'none',
                    zIndex: isSelected ? 100 : 10
                  };

                  if (el.type === 'text') {
                    innerNode = (
                      <span style={{ 
                        fontSize: `${el.fontSize || 24}px`, 
                        fontFamily: 'monospace', 
                        fontWeight: 'bold',
                        color: '#000',
                        whiteSpace: 'nowrap',
                        lineHeight: 1
                      }}>
                        {getSimulatedText(el.content)}
                      </span>
                    );
                  } else if (el.type === 'barcode') {
                    innerNode = (
                      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', padding: '2px' }}>
                        <div style={{ 
                          flex: 1, 
                          width: '100%', 
                          background: 'repeating-linear-gradient(90deg, #000, #000 3px, #fff 3px, #fff 7px)' 
                        }} />
                        <span style={{ fontSize: '9px', color: '#000', fontFamily: 'monospace', textAlign: 'center', fontWeight: 'bold' }}>
                          {getSimulatedText(el.content)}
                        </span>
                      </div>
                    );
                  } else if (el.type === 'qrcode') {
                    innerNode = (
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        border: '4px solid #000',
                        backgroundColor: '#fff',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        fontSize: '9px',
                        overflow: 'hidden'
                      }}>
                        <span>QR CODE</span>
                        <span style={{ fontSize: '7px', color: '#666' }}>({el.qrScale}x)</span>
                      </div>
                    );
                  } else if (el.type === 'box') {
                    elementStyle.border = `${el.thickness || 2}px solid #000`;
                    innerNode = null;
                  } else if (el.type === 'line') {
                    elementStyle.backgroundColor = '#000';
                    elementStyle.border = 'none';
                    innerNode = null;
                  }

                  return (
                    <div 
                      key={el.id}
                      style={elementStyle}
                      onMouseDown={(e) => handleElementMouseDown(e, el)}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = '#999';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      {innerNode}
                      
                      {/* Element corner labels when selected */}
                      {isSelected && (
                        <>
                          <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%' }} />
                          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%' }} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RAW ZPL TEXTAREA MODE */}
          {editorMode === 'code' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{
                padding: '8px 16px',
                backgroundColor: '#0c101d',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto'
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginRight: '6px' }}>Insertar Variable:</span>
                {['Puesto', 'Referencia', 'Ornamento', 'OrdenProduccion', 'OrdenCliente', 'Secuencia', 'SD', 'Mano', 'MinutosCurado', 'QrCompleto', 'FechaLectura'].map(v => (
                  <button 
                    key={v}
                    onClick={() => insertVariableInCodeEditor(v)}
                    style={{
                      padding: '3px 6px',
                      fontSize: '11px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    &#123;{v}&#125;
                  </button>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                value={zplCode}
                onChange={(e) => setZplCode(e.target.value)}
                style={{
                  flex: 1,
                  width: '100%',
                  margin: 0,
                  padding: '20px',
                  border: 'none',
                  backgroundColor: '#04070e',
                  color: '#10b981',
                  fontFamily: 'Fira Code, Consolas, Monaco, Courier New, monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="Escriba código ZPL..."
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ELEMENT PROPERTIES, PREVIEW AND TEST PANEL */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#090c14',
          overflowY: 'auto',
          padding: '20px',
          gap: '20px',
          boxSizing: 'border-box'
        }}>
          
          {/* 1. SELECTED ELEMENT PROPERTIES (Only visible in Visual mode) */}
          {editorMode === 'visual' && (
            <div className="card-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Propiedades del Elemento</span>
                {selectedElement && (
                  <button 
                    onClick={() => deleteElement(selectedElement.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </h3>
              
              {selectedElement ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Position coordinates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Posición X (px):</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        value={selectedElement.x} 
                        onChange={(e) => updateSelectedElement({ x: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Posición Y (px):</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        value={selectedElement.y} 
                        onChange={(e) => updateSelectedElement({ y: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>

                  {/* Size adjustments */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Ancho W (px):</label>
                      <input 
                        type="number" 
                        disabled={selectedElement.type === 'text'}
                        className="form-input" 
                        style={{ padding: '6px 10px', fontSize: '12px', opacity: selectedElement.type === 'text' ? 0.5 : 1 }}
                        value={selectedElement.w} 
                        onChange={(e) => updateSelectedElement({ w: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Alto H (px):</label>
                      <input 
                        type="number" 
                        disabled={selectedElement.type === 'text' || selectedElement.type === 'qrcode'}
                        className="form-input" 
                        style={{ padding: '6px 10px', fontSize: '12px', opacity: (selectedElement.type === 'text' || selectedElement.type === 'qrcode') ? 0.5 : 1 }}
                        value={selectedElement.h} 
                        onChange={(e) => updateSelectedElement({ h: parseInt(e.target.value) || 0 })} 
                      />
                    </div>
                  </div>

                  {/* Specific fields depending on type */}
                  {selectedElement.type === 'text' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Tamaño de Fuente:</label>
                      <select
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '12px', background: '#000' }}
                        value={selectedElement.fontSize || 24}
                        onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) })}
                      >
                        {[12, 16, 20, 24, 28, 32, 36, 40, 48, 60].map(s => (
                          <option key={s} value={s}>{s} px</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedElement.type === 'qrcode' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Escala del QR (1 - 10):</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="10" 
                        className="form-input" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        value={selectedElement.qrScale || 5}
                        onChange={(e) => updateSelectedElement({ qrScale: parseInt(e.target.value) || 5 })} 
                      />
                    </div>
                  )}

                  {(selectedElement.type === 'box' || selectedElement.type === 'line') && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '10px', marginBottom: '2px' }}>Grosor del Borde (px):</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        value={selectedElement.thickness || 2}
                        onChange={(e) => updateSelectedElement({ thickness: parseInt(e.target.value) || 2 })} 
                      />
                    </div>
                  )}

                  {/* Content & Variables list */}
                  {selectedElement.type !== 'box' && selectedElement.type !== 'line' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '10px', marginBottom: '2px' }}>Contenido / Variables:</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          value={selectedElement.content} 
                          onChange={(e) => updateSelectedElement({ content: e.target.value })} 
                        />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {['Puesto', 'Referencia', 'Ornamento', 'Secuencia', 'MinutosCurado', 'QrCompleto'].map(v => (
                          <button 
                            key={v}
                            onClick={() => updateSelectedElement({ content: `{${v}}` })}
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              background: '#1e293b',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#93c5fd'
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                  Seleccione un elemento del lienzo para editar sus propiedades.
                </div>
              )}
            </div>
          )}

          {/* 2. RENDERED PREVIEW IMAGE BLOCK */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Vista Previa del Renderizado
              </span>
              
              <button 
                onClick={() => fetchPreview(getActiveZpl(), simData)}
                disabled={isLoadingPreview}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
              >
                <RefreshCw size={10} className={isLoadingPreview ? 'pulse' : ''} />
                Actualizar Render
              </button>
            </div>

            <div style={{
              background: '#111827',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              minHeight: '220px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '12px',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8)'
            }}>
              {isLoadingPreview ? (
                <div className="pulse" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generando preview ZPL...</div>
              ) : previewError ? (
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <AlertTriangle size={24} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                  <div style={{ fontSize: '11px', color: '#ef4444' }}>{previewError}</div>
                </div>
              ) : previewImage ? (
                <img 
                  src={`data:image/png;base64,${previewImage}`} 
                  alt="Zebra Rendered Label" 
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '2px', padding: '4px' }} 
                />
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cargando preview...</span>
              )}
            </div>
          </div>

          {/* 3. SIMULATED VARIABLES DATA */}
          <div className="card-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} style={{ color: '#f59e0b' }} />
              Simulación de Datos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '10px', marginBottom: '2px' }}>Puesto:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  value={simData.puesto} 
                  onChange={(e) => handleSimDataChange('puesto', e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '10px', marginBottom: '2px' }}>Referencia:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  value={simData.referencia} 
                  onChange={(e) => handleSimDataChange('referencia', e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '10px', marginBottom: '2px' }}>Ornamento:</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  value={simData.codigoOrnamentoLeido} 
                  onChange={(e) => handleSimDataChange('codigoOrnamentoLeido', e.target.value)} 
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '10px', marginBottom: '2px' }}>Secuencia:</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                  value={simData.secuencia} 
                  onChange={(e) => handleSimDataChange('secuencia', parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>
          </div>

          {/* 4. PHYSICAL PRINTER TEST */}
          <div className="card-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={14} style={{ color: 'var(--accent-color)' }} />
              Prueba de Impresión Física
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {printers.length > 0 ? (
                <select 
                  value={selectedPrinter} 
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '12px', background: '#000' }}
                >
                  {printers.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  No se encontraron impresoras en Windows.
                </div>
              )}

              <button 
                onClick={handleTestPrint}
                disabled={printers.length === 0}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '12px', width: '100%' }}
              >
                <Printer size={12} />
                Imprimir Etiqueta de Prueba
              </button>

              {printStatus.message && (
                <div style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  backgroundColor: printStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                  border: '1px solid ' + (printStatus.type === 'success' ? '#10b981' : '#ef4444'),
                  color: printStatus.type === 'success' ? '#10b981' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{printStatus.message}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Save Notification HUD */}
      {saveStatus.message && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: saveStatus.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.2s ease-out',
          zIndex: 1000
        }}>
          <CheckCircle2 size={16} />
          <span style={{ fontSize: '12px', fontWeight: 600 }}>{saveStatus.message}</span>
        </div>
      )}

    </div>
  );
};
