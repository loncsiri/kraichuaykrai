import React, { useCallback, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';
import { ToastContext, type ToastType } from './toastContext';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[92%] max-w-[420px] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const styles: Record<ToastType, string> = {
            success: 'bg-emerald-600 text-white border-emerald-500',
            error: 'bg-rose-600 text-white border-rose-500',
            warning: 'bg-amber-500 text-slate-950 border-amber-400',
            info: 'bg-slate-800 text-white border-slate-700 dark:bg-slate-700',
          };
          const Icon =
            t.type === 'success'
              ? FiCheckCircle
              : t.type === 'error' || t.type === 'warning'
              ? FiAlertCircle
              : FiInfo;

          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${styles[t.type]}`}
            >
              <Icon className="shrink-0" size={18} />
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="ปิดการแจ้งเตือน"
                className="opacity-80 hover:opacity-100 p-0.5 cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
