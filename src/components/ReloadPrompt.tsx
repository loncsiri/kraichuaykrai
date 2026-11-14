import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { FiRefreshCw, FiX } from 'react-icons/fi';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[440px]">
      <div className="card p-3.5 shadow-xl flex items-center justify-between gap-3 border-[var(--primary-color)]">
        <div className="text-sm leading-snug">
          {needRefresh ? (
            <span className="font-medium">มีอัปเดตเวอร์ชันใหม่พร้อมใช้งาน</span>
          ) : (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              แอปพร้อมใช้งานแบบออฟไลน์แล้ว
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {needRefresh && (
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="btn-primary !py-1.5 !px-3 text-xs"
            >
              <FiRefreshCw size={14} />
              อัปเดต
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setNeedRefresh(false);
              setOfflineReady(false);
            }}
            aria-label="ปิดข้อความแจ้งเตือนอัปเดต"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FiX size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
