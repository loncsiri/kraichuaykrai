import React, { useState, useRef } from 'react';
import { FiShoppingBag, FiPlus, FiTrash2, FiEdit } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { Transaction } from '../store/useAppStore';

interface Props {
  tx: Transaction;
  formatMoney: (amount: number) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SwipeableTransactionItem: React.FC<Props> = ({ tx, formatMoney, onEdit, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef<number>(0);

  const ACTIONS_WIDTH = 140; // 70px per button * 2

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    let newOffsetX = (isOpen ? -ACTIONS_WIDTH : 0) + diff;
    if (newOffsetX > 0) newOffsetX = 0;
    if (newOffsetX < -(ACTIONS_WIDTH + 50)) newOffsetX = -(ACTIONS_WIDTH + 50); // slight rubber band
    
    setOffsetX(newOffsetX);
    currentXRef.current = newOffsetX;
  };

  const handleTouchEnd = () => {
    startXRef.current = null;
    if (currentXRef.current < -(ACTIONS_WIDTH / 2)) {
      setIsOpen(true);
      setOffsetX(-ACTIONS_WIDTH);
    } else {
      setIsOpen(false);
      setOffsetX(0);
    }
  };

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
      setOffsetX(0);
    } else {
      setIsOpen(true);
      setOffsetX(-ACTIONS_WIDTH);
    }
  };

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: '16px' }}>
      <div 
        className="flex"
        style={{ 
          width: `calc(100% + ${ACTIONS_WIDTH}px)`,
          transform: `translateX(${offsetX}px)`,
          transition: startXRef.current !== null ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          touchAction: 'pan-y'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Foreground Card */}
        <div 
          className="glass p-4 flex-col gap-2"
          style={{ width: '100%', cursor: 'pointer' }}
          onClick={toggleOpen}
        >
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
                <span className="text-right" style={{ width: '100px' }}>{tx.type === 'topup' ? '+' : '-'}{formatMoney(tx.type === 'topup' ? tx.userAmount : tx.totalAmount)}</span>
                <span className="text-left ml-2" style={{ width: '40px' }}>บาท</span>
              </div>
              {tx.type === 'expense' && (
                <div className="text-sm text-muted mt-1 flex-col gap-1 items-end" style={{ display: 'flex' }}>
                  <div className="flex justify-between items-center" style={{ width: '150px' }}>
                    <span>รัฐ:</span>
                    <div className="flex items-center text-primary font-semibold">
                      <span className="text-right" style={{ width: '60px' }}>{formatMoney(tx.govAmount)}</span>
                      <span className="text-left ml-2" style={{ width: '30px' }}>บาท</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center" style={{ width: '150px' }}>
                    <span>เรา:</span>
                    <div className="flex items-center font-semibold">
                      <span className="text-right" style={{ width: '60px' }}>{formatMoney(tx.userAmount)}</span>
                      <span className="text-left ml-2" style={{ width: '30px' }}>บาท</span>
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

        {/* Action Buttons to the right */}
        <div 
          className="flex"
          style={{ width: `${ACTIONS_WIDTH}px`, flexShrink: 0 }}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tx.id);
            }}
            className="flex-1 flex flex-col items-center justify-center text-white font-medium text-xs gap-1"
            style={{ background: 'var(--primary-color)' }}
          >
            <FiEdit size={20} />
            แก้ไข
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? ยอดเงินจะถูกคืนเข้ากระเป๋า')) {
                onDelete(tx.id);
              }
            }}
            className="flex-1 flex flex-col items-center justify-center text-white font-medium text-xs gap-1"
            style={{ background: 'var(--danger-color)' }}
          >
            <FiTrash2 size={20} />
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
};
