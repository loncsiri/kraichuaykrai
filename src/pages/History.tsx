import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { FiFilter } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { SwipeableTransactionItem } from '../components/SwipeableTransactionItem';

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
              <div className="grid grid-cols-[1fr_32px] gap-2 items-baseline w-[140px] text-primary font-bold text-lg">
                <span className="text-right">{formatMoney(totalGovPaid)}</span>
                <span className="text-left">บาท</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-base">
              <span className="text-muted font-medium">เราจ่ายเอง:</span>
              <div className="grid grid-cols-[1fr_32px] gap-2 items-baseline w-[140px] font-bold text-lg">
                <span className="text-right">{formatMoney(totalUserPaid)}</span>
                <span className="text-left">บาท</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="font-bold text-xl">ยอดรวมทั้งสิ้น:</span>
              <div className="grid grid-cols-[1fr_32px] gap-2 items-baseline w-[160px]">
                <span className="text-right font-bold text-3xl">{formatMoney(totalExpense)}</span>
                <span className="text-left font-bold text-xl">บาท</span>
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
                <SwipeableTransactionItem 
                  key={tx.id}
                  tx={tx}
                  formatMoney={formatMoney}
                  onEdit={(id) => navigate(`/add?editId=${id}`)}
                  onDelete={(id) => store.deleteTransaction(id)}
                />
              ))}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};
