import React, { useEffect, useState } from 'react';
import { FiEdit2, FiImage, FiPlus, FiShoppingBag, FiTrash2, FiX } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import type { Transaction } from '../store/types';
import { formatMoney } from '../utils/money';
import { getSlipImage } from '../utils/slipStorage';
import { ConfirmModal } from './ui/ConfirmModal';

interface Props {
  tx: Transaction;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SwipeableTransactionItem: React.FC<Props> = ({ tx, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (slipUrl) URL.revokeObjectURL(slipUrl);
    };
  }, [slipUrl]);

  const handleOpenSlip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = await getSlipImage(tx.id);
    if (blob) {
      setSlipUrl(URL.createObjectURL(blob));
    }
  };

  return (
    <>
      <div className="card overflow-hidden transition">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left p-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
          aria-expanded={isOpen}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  tx.type === 'topup'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                {tx.type === 'topup' ? <FiPlus size={18} /> : <FiShoppingBag size={18} />}
              </div>

              <div className="min-w-0">
                <div className="font-semibold text-base truncate">{tx.title}</div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
                  <span>{format(parseISO(tx.timestamp), 'HH:mm')} น.</span>
                  {tx.category && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--text-color)]">
                      {tx.category}
                    </span>
                  )}
                  {tx.hasSlipImage && (
                    <span
                      onClick={handleOpenSlip}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void handleOpenSlip(e as unknown as React.MouseEvent);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-[var(--primary-color)] hover:bg-blue-500/20"
                    >
                      <FiImage size={11} /> สลิป
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 tabular-nums">
              <div
                className={`font-bold text-lg ${
                  tx.type === 'topup' ? 'text-emerald-600 dark:text-emerald-400' : ''
                }`}
              >
                {tx.type === 'topup' ? '+' : '-'}
                {formatMoney(tx.type === 'topup' ? tx.userAmount : tx.totalAmount)} ฿
              </div>
              {tx.type === 'expense' && (
                <div className="text-xs text-[var(--text-muted)] mt-1 space-y-0.5 text-right">
                  <div>
                    รัฐ{tx.govRatio !== undefined ? ` (${tx.govRatio}%)` : ''}:{' '}
                    <span className="font-semibold text-[var(--primary-color)]">
                      {formatMoney(tx.govAmount)}
                    </span>
                  </div>
                  <div>
                    เรา{tx.userRatio !== undefined ? ` (${tx.userRatio}%)` : ''}:{' '}
                    <span className="font-semibold text-[var(--text-color)]">
                      {formatMoney(tx.userAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {tx.note && (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-[var(--surface-muted)] text-xs text-[var(--text-muted)]">
              หมายเหตุ: {tx.note}
            </div>
          )}
        </button>

        {isOpen && (
          <div className="flex border-t border-[var(--card-border)]">
            <button
              type="button"
              onClick={() => onEdit(tx.id)}
              className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--primary-color)] bg-blue-500/5 hover:bg-blue-500/10 border-r border-[var(--card-border)] cursor-pointer transition"
            >
              <FiEdit2 size={15} />
              แก้ไข
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex-1 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition"
            >
              <FiTrash2 size={15} />
              ลบ
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="ลบรายการนี้?"
        description={`ต้องการลบ "${tx.title}" ใช่หรือไม่? ยอดเงินในกระเป๋าและสิทธิ์จะถูกคำนวณกลับให้อัตโนมัติ`}
        confirmLabel="ลบรายการ"
        variant="danger"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(tx.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      {slipUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSlipUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="ภาพสลิปที่บันทึกไว้"
        >
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSlipUrl(null)}
              aria-label="ปิดภาพสลิป"
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <img
              src={slipUrl}
              alt={`สลิป ${tx.title}`}
              className="w-full max-h-[80vh] object-contain rounded-2xl bg-white shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
