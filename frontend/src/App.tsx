import { useState, useEffect } from 'react';
import { OperativeView } from './components/OperativeView';
import { HistoryView } from './components/HistoryView';
import { ConfigView } from './components/ConfigView';
import { Settings, BarChart2, Cpu } from 'lucide-react';

type ViewMode = 'OPERATIVE' | 'HISTORY' | 'CONFIG';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('OPERATIVE');
  
  // Base configuration settings
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    const local = localStorage.getItem('api_base_url');
    if (local) return local;
    return window.location.origin.includes('http') ? window.location.origin : 'http://localhost:5121';
  });
  
  const [puesto, setPuesto] = useState(() => {
    return localStorage.getItem('active_puesto') || 'DL01';
  });

  const [refreshIntervalSec, setRefreshIntervalSec] = useState(() => {
    return parseInt(localStorage.getItem('refresh_interval') || '5', 10);
  });

  const [operador] = useState(() => {
    return localStorage.getItem('active_operador') || 'OP-JUAN';
  });

  // Simulator configurations
  const [mockDbError, setMockDbError] = useState(false);
  const [mockPrintFolderError, setMockPrintFolderError] = useState(false);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('api_base_url', apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    localStorage.setItem('active_puesto', puesto);
  }, [puesto]);

  useEffect(() => {
    localStorage.setItem('refresh_interval', refreshIntervalSec.toString());
  }, [refreshIntervalSec]);

  // Load live config settings directly from the DB on startup
  const reloadFromDbConfig = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.Workstation_Puesto) {
          setPuesto(data.Workstation_Puesto);
          localStorage.setItem('active_puesto', data.Workstation_Puesto);
        }
        if (data.Refresh_Interval_Sec) {
          const sec = parseInt(data.Refresh_Interval_Sec, 10);
          setRefreshIntervalSec(sec);
          localStorage.setItem('refresh_interval', sec.toString());
        }
      }
    } catch (e) {
      console.warn("Failed to load configs from API. Using local fallbacks.", e);
    }
  };

  useEffect(() => {
    reloadFromDbConfig();
  }, [apiBaseUrl]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      height: '100vh', 
      width: '100vw', 
      backgroundColor: '#070a13', 
      color: '#fff', 
      overflow: 'hidden' 
    }}>
      
      {/* SIDEBAR NAVIGATION (HMI Control Menu) */}
      <nav style={{ 
        width: '80px', 
        backgroundColor: '#0a0d16', 
        borderRight: '1px solid var(--border-color)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '24px 0', 
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)' }}>
            <Cpu size={24} style={{ color: '#fff' }} />
          </div>

          {/* Action Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <button 
              onClick={() => setViewMode('OPERATIVE')}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'OPERATIVE' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: viewMode === 'OPERATIVE' ? '#3b82f6' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              title="Operaciones de Planta"
            >
              <Cpu size={22} />
              <span style={{ fontSize: '8px', fontWeight: 700 }}>DL01</span>
            </button>

            <button 
              onClick={() => setViewMode('HISTORY')}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'HISTORY' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: viewMode === 'HISTORY' ? '#3b82f6' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              title="Logs Historial"
            >
              <BarChart2 size={22} />
              <span style={{ fontSize: '8px', fontWeight: 700 }}>LOGS</span>
            </button>

            <button 
              onClick={() => setViewMode('CONFIG')}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'CONFIG' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: viewMode === 'CONFIG' ? '#3b82f6' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              title="Administración"
            >
              <Settings size={22} />
              <span style={{ fontSize: '8px', fontWeight: 700 }}>SETTINGS</span>
            </button>
          </div>
        </div>

        {/* API Connection settings drawer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-secondary)' }}>
            <strong>API Target:</strong>
            <input 
              type="text" 
              value={apiBaseUrl} 
              onChange={(e) => setApiBaseUrl(e.target.value)} 
              style={{
                width: '68px',
                fontSize: '8px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                textAlign: 'center',
                padding: '2px 0',
                borderRadius: '4px',
                marginTop: '4px'
              }}
            />
          </div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>v1.0.0</div>
        </div>
      </nav>

      {/* VIEWPORT AREA */}
      <div style={{ flex: 1, height: '100vh', overflow: 'hidden', position: 'relative' }}>
        {viewMode === 'OPERATIVE' && (
          <OperativeView 
            apiBaseUrl={apiBaseUrl}
            puesto={puesto}
            refreshIntervalSec={refreshIntervalSec}
            operador={operador}
            onOpenConfig={() => setViewMode('CONFIG')}
            mockDbError={mockDbError}
            setMockDbError={setMockDbError}
            mockPrintFolderError={mockPrintFolderError}
            setMockPrintFolderError={setMockPrintFolderError}
          />
        )}

        {viewMode === 'HISTORY' && (
          <HistoryView 
            apiBaseUrl={apiBaseUrl}
            onClose={() => setViewMode('OPERATIVE')}
          />
        )}

        {viewMode === 'CONFIG' && (
          <ConfigView 
            apiBaseUrl={apiBaseUrl}
            onClose={() => setViewMode('OPERATIVE')}
            onConfigUpdated={reloadFromDbConfig}
          />
        )}
      </div>

    </div>
  );
}

export default App;
