import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { FiSun, FiMoon, FiSettings, FiPlus, FiHome, FiList, FiRefreshCw, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export const Layout: React.FC = () => {
  const { settings, setTheme, syncStatus, googleSheetsEnabled } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const toggleTheme = () => {
    setTheme(settings.theme === 'light' ? 'dark' : 'light');
  };

  const isHome = location.pathname === '/';
  const isAdd = location.pathname === '/add';

  return (
    <>
      <header className="glass" style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        zIndex: 10,
        borderRadius: '0 0 16px 16px',
        borderTop: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span style={{ fontSize: '24px' }}>🇹🇭</span>
          <h1 className="font-bold text-xl text-primary">ใครช่วยใครพลัส</h1>
        </div>
        <div className="flex gap-2 items-center">
          {googleSheetsEnabled && (
            <div className="text-sm mr-2" title="สถานะ Google Sheets">
              {syncStatus === 'syncing' && <FiRefreshCw className="text-primary animate-spin" size={18} />}
              {syncStatus === 'success' && <FiCheckCircle className="text-success" size={18} />}
              {syncStatus === 'error' && <FiXCircle className="text-danger" size={18} />}
            </div>
          )}
          <button className="btn-icon" onClick={toggleTheme}>
            {settings.theme === 'light' ? <FiMoon size={20} /> : <FiSun size={20} />}
          </button>
          <button className="btn-icon" onClick={() => navigate('/settings')}>
            <FiSettings size={20} />
          </button>
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>

      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '600px',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {!isAdd && (
          <button
            className="btn-primary shadow"
            style={{
              position: 'absolute',
              right: '20px',
              bottom: '0',
              width: '60px',
              height: '60px',
              borderRadius: '30px',
              fontSize: '24px',
              boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.5)',
              pointerEvents: 'auto'
            }}
            onClick={() => navigate('/add')}
          >
            <FiPlus />
          </button>
        )}
      </div>

      {/* Bottom Nav Menu */}
      <nav className="glass" style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0',
        borderRadius: '16px 16px 0 0',
        borderBottom: 'none',
        zIndex: 9
      }}>
        <div 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: isHome ? 'var(--primary-color)' : 'var(--text-muted)' }}
          onClick={() => navigate('/')}
        >
          <FiHome size={24} />
          <span className="text-sm mt-2">หน้าหลัก</span>
        </div>
        <div 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', color: location.pathname === '/history' ? 'var(--primary-color)' : 'var(--text-muted)' }}
          onClick={() => navigate('/history')}
        >
          <FiList size={24} />
          <span className="text-sm mt-2">ประวัติ</span>
        </div>
      </nav>
    </>
  );
};
