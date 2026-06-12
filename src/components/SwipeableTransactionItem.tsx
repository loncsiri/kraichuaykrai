import React, { useState } from 'react';
import { FiShoppingBag, FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import type { Transaction } from '../store/useAppStore';

interface Props {
  tx: Transaction;
  formatMoney: (amount: number) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SwipeableTransactionItem: React.FC<Props> = ({ tx, formatMoney, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="glass flex-col"
      style={{ cursor: 'pointer', overflow: 'hidden', padding: 0 }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="p-4 flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 mt-1">
            <div className="btn-icon" style={{ 
              background: tx.type === 'topup' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              color: tx.type === 'topup' ? 'var(--secondary-color)' : 'var(--danger-color)',
              flexShrink: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}>
              {tx.type === 'topup' ? <FiPlus /> : <FiShoppingBag />}
            </div>
            <div>
              <div className="font-semibold">{tx.title}</div>
              <div className="text-sm text-muted mt-1">
                {format(parseISO(tx.timestamp), 'HH:mm')} น.
              </div>
            </div>
          </div>
          <div className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <div className={`flex justify-end items-center font-bold text-xl ${tx.type === 'topup' ? 'text-success' : ''}`}>
              <span className="inline-block text-right" style={{ width: '90px' }}>{tx.type === 'topup' ? '+' : '-'}{formatMoney(tx.type === 'topup' ? tx.userAmount : tx.totalAmount)}</span>
              <span className="inline-block text-left ml-2" style={{ width: '32px' }}>บาท</span>
            </div>
            {tx.type === 'expense' && (
              <div className="text-sm text-muted mt-1 flex-col gap-1 items-end" style={{ display: 'flex' }}>
                <div className="flex justify-between items-center" style={{ width: '100%' }}>
                  <span>รัฐ:</span>
                  <div className="flex items-center text-primary font-semibold">
                    <span className="inline-block text-right" style={{ width: '90px' }}>{formatMoney(tx.govAmount)}</span>
                    <span className="inline-block text-left ml-2" style={{ width: '32px' }}>บาท</span>
                  </div>
                </div>
                <div className="flex justify-between items-center" style={{ width: '100%' }}>
                  <span>เรา:</span>
                  <div className="flex items-center font-semibold">
                    <span className="inline-block text-right" style={{ width: '90px' }}>{formatMoney(tx.userAmount)}</span>
                    <span className="inline-block text-left ml-2" style={{ width: '32px' }}>บาท</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {tx.note && (
          <div className="text-sm text-muted mt-2 p-2" style={{ background: 'var(--bg-color)', borderRadius: '8px' }}>
            หมายเหตุ: {tx.note}
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="flex border-t" 
          style={{ borderColor: 'var(--card-border)' }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tx.id);
            }}
            className="flex-1 flex items-center justify-center gap-2"
            style={{ 
              padding: '12px', 
              color: 'var(--primary-color)', 
              background: 'rgba(59, 130, 246, 0.05)',
              borderRight: '1px solid var(--card-border)',
              borderRadius: '0 0 0 16px',
              border: 'none'
            }}
          >
            <FiEdit size={18} />
            <span className="font-semibold">แก้ไข</span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? ยอดเงินจะถูกคืนเข้ากระเป๋า')) {
                onDelete(tx.id);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2"
            style={{ 
              padding: '12px', 
              color: 'var(--danger-color)', 
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: '0 0 16px 0',
              border: 'none'
            }}
          >
            <FiTrash2 size={18} />
            <span className="font-semibold">ลบ</span>
          </button>
        </div>
      )}
    </div>
  );
};
