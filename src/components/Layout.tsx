import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore, type ThemeMode } from '../store/useAppStore';
import {
  FiCheckCircle,
  FiHome,
  FiList,
  FiMonitor,
  FiMoon,
  FiPieChart,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiSun,
  FiWifiOff,
  FiXCircle,
} from 'react-icons/fi';
import { ReloadPrompt } from './ReloadPrompt';

const THEME_ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'ธีม: ตามระบบ',
  light: 'ธีม: สว่าง',
  dark: 'ธีม: มืด',
};

export const Layout: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);
  const syncStatus = useAppStore((s) => s.syncStatus);
  const googleSheetsEnabled = useAppStore((s) => s.googleSheetsEnabled);
  const syncQueue = useAppStore((s) => s.syncQueue);
  const flushSyncQueue = useAppStore((s) => s.flushSyncQueue);

  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Resolve system / light / dark theme
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolved =
        settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme;
      document.documentElement.setAttribute('data-theme', resolved);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', resolved === 'dark' ? '#0b1120' : '#2563eb');
      }
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  // Auto-flush offline Google Sheets sync queue when returning online
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void flushSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine && syncQueue.length > 0) {
      void flushSyncQueue();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushSyncQueue, syncQueue.length]);

  const cycleTheme = () => {
    const idx = THEME_ORDER.indexOf(settings.theme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setTheme(next);
  };

  const isAdd = location.pathname === '/add';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-xl text-xs font-medium transition cursor-pointer ${
      isActive
        ? 'text-[var(--primary-color)] font-semibold'
        : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'
    }`;

  return (
    <div className="min-h-screen flex flex-col max-w-[640px] mx-auto relative">
      {/* Top Header */}
      <header className="card-glass fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-20 px-4 py-3 flex items-center justify-between rounded-b-2xl border-t-0">
        <Link to="/" className="flex items-center gap-2.5 no-underline text-inherit">
          <img src="/icon.svg" alt="" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-lg tracking-tight text-[var(--primary-color)]">
            ใครช่วยใครพลัส
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {!isOnline && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400"
              title="ใช้งานแบบออฟไลน์"
            >
              <FiWifiOff size={13} />
              <span>ออฟไลน์</span>
            </span>
          )}

          {googleSheetsEnabled && (
            <button
              type="button"
              onClick={() => (syncQueue.length > 0 ? void flushSyncQueue() : navigate('/settings'))}
              aria-label="สถานะ Google Sheets"
              title={
                syncQueue.length > 0
                  ? `ค้างส่ง ${syncQueue.length} รายการ (กดเพื่อซิงค์)`
                  : 'สถานะ Google Sheets'
              }
              className="relative p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              {syncStatus === 'syncing' && (
                <FiRefreshCw className="text-[var(--primary-color)] animate-spin" size={18} />
              )}
              {syncStatus === 'success' && (
                <FiCheckCircle className="text-emerald-600 dark:text-emerald-400" size={18} />
              )}
              {syncStatus === 'error' && (
                <FiXCircle className="text-rose-600 dark:text-rose-400" size={18} />
              )}
              {syncStatus === 'idle' && (
                <FiRefreshCw className="text-[var(--text-muted)]" size={17} />
              )}
              {syncQueue.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {syncQueue.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={THEME_LABELS[settings.theme]}
            title={THEME_LABELS[settings.theme]}
            className="p-2 rounded-full text-[var(--text-color)] hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            {settings.theme === 'system' && <FiMonitor size={19} />}
            {settings.theme === 'light' && <FiSun size={19} />}
            {settings.theme === 'dark' && <FiMoon size={19} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-20 pb-28">
        <Outlet />
      </main>

      <ReloadPrompt />

      {/* Bottom Navigation */}
      <nav
        aria-label="เมนูหลัก"
        className="card-glass fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-20 rounded-t-2xl border-b-0 pb-safe"
      >
        <div className="grid grid-cols-5 items-center px-2 py-1.5">
          <NavLink to="/" end className={navLinkClass}>
            <FiHome size={20} />
            <span>หน้าหลัก</span>
          </NavLink>

          <NavLink to="/history" className={navLinkClass}>
            <FiList size={20} />
            <span>ประวัติ</span>
          </NavLink>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/add')}
              aria-label="เพิ่มรายการใหม่"
              className={`w-12 h-12 -mt-5 rounded-full flex items-center justify-center shadow-lg text-white transition cursor-pointer ${
                isAdd
                  ? 'bg-[var(--primary-hover)] ring-4 ring-blue-500/25'
                  : 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover)]'
              }`}
            >
              <FiPlus size={24} />
            </button>
          </div>

          <NavLink to="/insights" className={navLinkClass}>
            <FiPieChart size={20} />
            <span>สรุป</span>
          </NavLink>

          <NavLink to="/settings" className={navLinkClass}>
            <FiSettings size={20} />
            <span>ตั้งค่า</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
