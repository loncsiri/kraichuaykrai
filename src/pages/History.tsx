import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { FiShoppingBag, FiPlus, FiFilter, FiTrash2, FiEdit } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export const History = () => {
  const store = useAppStore();
  const navigate = useNavigate();
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const months = Array.from(new Set(
    store.transactions.map(tx => format(parseISO(tx.timestamp), 'yyyy-MM'))
  )).sort().reverse();

  const filteredTransactions = store.transactions.filter(tx => {
    if (filterMonth === 'all') return true;
    return format(parseISO(tx.timestamp), 'yyyy-MM') === filterMonth;
  });

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.totalAmount, 0);
    
  const totalGovPaid = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.govAmount, 0);

  const totalUserPaid = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.userAmount, 0);

  // Group by day
  const groupedTransactions: Record<string, typeof store.transactions> = {};
  filteredTransactions.forEach(tx => {
    const day = format(parseISO(tx.timestamp), 'yyyy-MM-dd');
    if (!groupedTransactions[day]) {
      groupedTransactions[day] = [];
    }
    groupedTransactions[day].push(tx);
  });

  const sortedDays = Object.keys(groupedTransactions).sort().reverse();

  return (
    <div className="flex-col gap-4">
      <h2 className="font-bold text-xl mb-2">ประวัติการทำรายการ</h2>

      <div className="glass p-2 flex items-center gap-2 mb-4">
        <FiFilter className="text-muted ml-2" />
        <select 
          value={filterMonth} 
          onChange={e => setFilterMonth(e.target.value)}
          style={{ margin: 0, padding: '4px 8px', border: 'none', background: 'transparent', outline: 'none', flex: 1, cursor: 'pointer' }}
        >
          <option value="all">ทั้งหมด</option>
          {months.map(m => (
            <option key={m} value={m}>
              {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: th })}
            </option>
          ))}
        </select>
      </div>

      {filteredTransactions.length > 0 && (
        <div className="glass p-4 mb-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <div className="text-base font-semibold text-primary mb-3">สรุปยอดใช้จ่าย (ที่แสดง)</div>
          
          <div className="flex-col gap-3">
            <div className="flex justify-between items-center text-base">
              <span className="text-muted font-medium">รัฐช่วยจ่าย:</span>
              <div className="flex items-center">
                <span className="text-primary font-bold text-lg text-right" style={{ width: '100px' }}>{formatMoney(totalGovPaid)}</span>
                <span className="text-primary font-bold text-lg text-left ml-2" style={{ width: '40px' }}>บาท</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-base">
              <span className="text-muted font-medium">เราจ่ายเอง:</span>
              <div className="flex items-center">
                <span className="font-bold text-lg text-right" style={{ width: '100px' }}>{formatMoney(totalUserPaid)}</span>
                <span className="font-bold text-lg text-left ml-2" style={{ width: '40px' }}>บาท</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="font-bold text-xl">ยอดรวมทั้งสิ้น:</span>
              <div className="flex items-center">
                <span className="font-bold text-3xl text-right" style={{ width: '120px' }}>{formatMoney(totalExpense)}</span>
                <span className="font-bold text-xl text-left ml-2" style={{ width: '40px' }}>บาท</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-col gap-4">
        {sortedDays.length === 0 ? (
          <div className="glass p-8 text-center text-muted">
            ไม่มีประวัติการทำรายการ
          </div>
        ) : (
          sortedDays.map(day => {
            const dayTransactions = groupedTransactions[day];
            const dayTotalExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.totalAmount, 0);
            const dayTotalGov = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.govAmount, 0);
            const dayTotalUser = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.userAmount, 0);

            return (
            <div key={day} className="flex-col gap-2">
              <div className="flex justify-between items-end mb-1 mx-2">
                <h3 className="font-semibold text-sm text-muted">
                  {format(parseISO(day), 'd MMMM yyyy', { locale: th })}
                </h3>
                {dayTotalExpense > 0 && (
                  <div className="text-right text-muted" style={{ fontSize: '12px' }}>
                    <div className="font-semibold" style={{ color: 'var(--text-color)' }}>ยอดรวม {formatMoney(dayTotalExpense)} บ.</div>
                    <div style={{ fontSize: '11px' }}>
                      (รัฐ <span className="text-primary font-medium">{formatMoney(dayTotalGov)}</span> / เรา <span className="font-medium">{formatMoney(dayTotalUser)}</span>)
                    </div>
                  </div>
                )}
              </div>
              {dayTransactions.map(tx => (
                <div key={tx.id} className="glass p-4 flex-col gap-2">
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
                  <div className="flex justify-end mt-1 gap-4">
                    <button 
                      onClick={() => navigate(`/add?editId=${tx.id}`)}
                      className="flex items-center gap-1 text-xs text-primary opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <FiEdit size={14} /> แก้ไขรายการ
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่? ยอดเงินจะถูกคืนเข้ากระเป๋า')) {
                          store.deleteTransaction(tx.id);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-danger opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <FiTrash2 size={14} /> ลบรายการ
                    </button>
                  </div>
                </div>
              ))}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
