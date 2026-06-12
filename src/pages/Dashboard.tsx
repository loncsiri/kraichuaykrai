import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { calculateRemainingGov } from '../utils/calculations';
import { FiCreditCard, FiShoppingBag, FiClock, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

export const Dashboard: React.FC = () => {
  const store = useAppStore();
  const navigate = useNavigate();
  const { govSpentMonthly, remainingGovMonthly, govSpentDaily, remainingGovDaily } = calculateRemainingGov(store);
  const maxPurchaseDaily = store.settings.supportRatioGov > 0 
    ? remainingGovDaily / (store.settings.supportRatioGov / 100) 
    : 0;
  const reqWalletDaily = maxPurchaseDaily - remainingGovDaily;

  const maxPurchaseMonthly = store.settings.supportRatioGov > 0 
    ? remainingGovMonthly / (store.settings.supportRatioGov / 100) 
    : 0;
  const reqWalletMonthly = maxPurchaseMonthly - remainingGovMonthly;

  const dailyLimit = store.settings.dailySupportLimit;
  const dailyPercent = dailyLimit > 0 ? (govSpentDaily / dailyLimit) * 100 : 0;
  
  const monthlyLimit = store.settings.monthlySupportAmount;
  const monthlyPercent = monthlyLimit > 0 ? (govSpentMonthly / monthlyLimit) * 100 : 0;

  const recentTransactions = store.transactions.slice(0, 3);

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex-col gap-4">
      {/* Daily Group */}
      <div className="glass p-4">
        <h2 className="font-bold text-lg mb-4 text-primary">ยอดรายวัน</h2>
        
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">ใช้สิทธิ์ไปแล้ว: <span className="font-semibold" style={{ color: 'var(--text-color)' }}>{formatMoney(govSpentDaily)}</span> บาท</span>
            <span className="text-muted">ลิมิต: <span className="font-semibold" style={{ color: 'var(--text-color)' }}>{formatMoney(dailyLimit)}</span> บาท</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'rgba(150, 150, 150, 0.2)', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--primary-color)', height: '100%', borderRadius: '10px', transition: 'width 0.5s ease', width: `${Math.min(100, dailyPercent)}%` }}></div>
          </div>
          <div className="text-right text-sm">
            <span className="text-muted">สิทธิ์คงเหลือ:</span> <span className="text-primary font-bold ml-1">{formatMoney(remainingGovDaily)} บาท</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div className="text-xs text-muted mb-1">ยอดซื้อสินค้าได้สูงสุด</div>
            <div className="font-bold text-xl text-right">{formatMoney(maxPurchaseDaily)} บาท</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div className="text-xs text-muted mb-1">เราต้องมีเงินจ่าย</div>
            <div className="font-bold text-xl text-right">{formatMoney(reqWalletDaily)} บาท</div>
          </div>
        </div>
      </div>

      {/* Monthly Group */}
      <div className="glass p-4">
        <h2 className="font-bold text-lg mb-4 text-primary">ยอดรายเดือน</h2>
        
        <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">ใช้สิทธิ์ไปแล้ว: <span className="font-semibold" style={{ color: 'var(--text-color)' }}>{formatMoney(govSpentMonthly)}</span> บาท</span>
            <span className="text-muted">ลิมิต: <span className="font-semibold" style={{ color: 'var(--text-color)' }}>{formatMoney(monthlyLimit)}</span> บาท</span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'rgba(150, 150, 150, 0.2)', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--primary-color)', height: '100%', borderRadius: '10px', transition: 'width 0.5s ease', width: `${Math.min(100, monthlyPercent)}%` }}></div>
          </div>
          <div className="text-right text-sm">
            <span className="text-muted">สิทธิ์คงเหลือ:</span> <span className="text-primary font-bold ml-1">{formatMoney(remainingGovMonthly)} บาท</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div className="text-xs text-muted mb-1">ยอดซื้อสินค้าได้สูงสุด</div>
            <div className="font-bold text-xl text-right">{formatMoney(maxPurchaseMonthly)} บาท</div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div className="text-xs text-muted mb-1">เราต้องมีเงินจ่าย</div>
            <div className="font-bold text-xl text-right">{formatMoney(reqWalletMonthly)} บาท</div>
          </div>
        </div>
      </div>

      {/* Wallet Balance */}
      <div className="glass p-4 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FiCreditCard className="text-muted" />
            <span className="text-sm text-muted">เงินในกระเป๋าเรา</span>
          </div>
          <div className="font-bold text-2xl">{formatMoney(store.walletBalance)} บาท</div>
        </div>
        <button 
          className="btn-primary" 
          style={{ padding: '8px 16px', borderRadius: '20px' }}
          onClick={() => navigate('/add?type=topup')}
        >
          <FiPlus /> เติมเงิน
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">รายการล่าสุด</h3>
          <button className="btn-icon text-primary" onClick={() => navigate('/history')} style={{ fontSize: '14px', width: 'auto', padding: '4px 8px' }}>
            ดูทั้งหมด
          </button>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div className="glass p-4 text-center text-muted flex-col items-center gap-2">
            <FiClock size={24} />
            <div>ยังไม่มีรายการใช้จ่าย</div>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="glass p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
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
                    <div className="text-sm text-muted">{format(parseISO(tx.timestamp), 'dd MMM yyyy HH:mm')}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0" style={{ minWidth: '160px' }}>
                  <div className={`flex justify-end items-baseline font-bold text-lg ${tx.type === 'topup' ? 'text-success' : ''}`}>
                    <span className="text-right tabular-nums" style={{ marginRight: '12px' }}>{tx.type === 'topup' ? '+' : '-'}{formatMoney(tx.totalAmount || tx.userAmount)}</span>
                    <span className="text-left text-base" style={{ width: '32px' }}>บาท</span>
                  </div>
                  {tx.type === 'expense' && (
                    <div className="text-sm text-muted mt-1 flex flex-col gap-1 w-full pl-4" style={{ fontSize: '12px' }}>
                      <div className="flex justify-between items-baseline w-full">
                        <span>รัฐ:</span>
                        <div className="flex justify-end items-baseline">
                          <span className="text-right tabular-nums" style={{ marginRight: '12px' }}>{formatMoney(tx.govAmount)}</span>
                          <span className="text-left" style={{ width: '32px' }}>บาท</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-baseline w-full">
                        <span>เรา:</span>
                        <div className="flex justify-end items-baseline">
                          <span className="text-right tabular-nums" style={{ marginRight: '12px' }}>{formatMoney(tx.userAmount)}</span>
                          <span className="text-left" style={{ width: '32px' }}>บาท</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
