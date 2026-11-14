import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import { useActiveTransactions, useAppStore } from '../store/useAppStore';
import { formatMoney, fromSatang, toSatang } from '../utils/money';
import { SwipeableTransactionItem } from '../components/SwipeableTransactionItem';
import { useToast } from '../components/ui/toastContext';

export const History: React.FC = () => {
  const activeTransactions = useActiveTransactions();
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const categories = useAppStore((s) => s.settings.categories);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'topup'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const months = useMemo(
    () =>
      Array.from(
        new Set(activeTransactions.map((tx) => format(parseISO(tx.timestamp), 'yyyy-MM')))
      )
        .sort()
        .reverse(),
    [activeTransactions]
  );

  const availableCategories = useMemo(() => {
    const set = new Set(categories);
    activeTransactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [categories, activeTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeTransactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterMonth !== 'all' && format(parseISO(tx.timestamp), 'yyyy-MM') !== filterMonth) {
        return false;
      }
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
      if (q) {
        const hay = `${tx.title} ${tx.note} ${tx.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeTransactions, filterType, filterMonth, filterCategory, searchQuery]);

  const totals = useMemo(() => {
    let expenseSatang = 0;
    let govSatang = 0;
    let userSatang = 0;
    let topupSatang = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'expense') {
        expenseSatang += toSatang(t.totalAmount);
        govSatang += toSatang(t.govAmount);
        userSatang += toSatang(t.userAmount);
      } else {
        topupSatang += toSatang(t.userAmount);
      }
    }
    return {
      totalExpense: fromSatang(expenseSatang),
      totalGovPaid: fromSatang(govSatang),
      totalUserPaid: fromSatang(userSatang),
      totalTopup: fromSatang(topupSatang),
    };
  }, [filteredTransactions]);

  const groupedByDay = useMemo(() => {
    const groups: Record<string, typeof filteredTransactions> = {};
    const sorted = [...filteredTransactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    for (const tx of sorted) {
      const day = format(parseISO(tx.timestamp), 'yyyy-MM-dd');
      if (!groups[day]) groups[day] = [];
      groups[day].push(tx);
    }
    return groups;
  }, [filteredTransactions]);

  const sortedDays = Object.keys(groupedByDay).sort().reverse();
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterType !== 'all' ||
    filterMonth !== 'all' ||
    filterCategory !== 'all';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-xl">ประวัติการทำรายการ</h2>
        <span className="text-xs text-[var(--text-muted)]">
          {filteredTransactions.length} รายการ
        </span>
      </div>

      {/* Search & Filters */}
      <div className="card p-3.5 flex flex-col gap-3">
        <div className="relative">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={16}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อร้าน, หมายเหตุ, หมวดหมู่..."
            aria-label="ค้นหารายการ"
            className="input-field !pl-9 !pr-8 !py-2 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="ล้างคำค้นหา"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] cursor-pointer"
            >
              <FiX size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['all', 'ทั้งหมด'],
              ['expense', 'รายจ่าย'],
              ['topup', 'เติมเงิน'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilterType(val)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                filterType === val
                  ? 'bg-[var(--primary-color)] text-white'
                  : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--card-border)]'
              }`}
            >
              {label}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterMonth('all');
                setFilterCategory('all');
              }}
              className="ml-auto text-xs font-medium text-rose-600 dark:text-rose-400 cursor-pointer hover:underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <FiFilter className="text-[var(--text-muted)] shrink-0" size={14} />
            <select
              aria-label="กรองตามเดือน"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="input-field !py-1.5 !px-2.5 text-xs"
            >
              <option value="all">ทุกเดือน</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: th })}
                </option>
              ))}
            </select>
          </div>

          <select
            aria-label="กรองตามหมวดหมู่"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-field !py-1.5 !px-2.5 text-xs"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtered Summary Card */}
      {filteredTransactions.length > 0 && (
        <div className="card p-4 tabular-nums">
          <div className="text-sm font-bold text-[var(--primary-color)] mb-3">
            สรุปยอดตามตัวกรอง
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-sm mb-3">
            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)]">
              <div className="text-xs text-[var(--text-muted)]">รัฐช่วยจ่าย</div>
              <div className="font-bold text-base text-[var(--primary-color)]">
                {formatMoney(totals.totalGovPaid)} ฿
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--surface-muted)]">
              <div className="text-xs text-[var(--text-muted)]">เราจ่ายเอง</div>
              <div className="font-bold text-base">{formatMoney(totals.totalUserPaid)} ฿</div>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-2.5 border-t border-[var(--card-border)]">
            <span className="font-bold text-base">ยอดซื้อรวมทั้งสิ้น</span>
            <span className="font-bold text-2xl">{formatMoney(totals.totalExpense)} ฿</span>
          </div>
          {totals.totalTopup > 0 && (
            <div className="flex items-baseline justify-between mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              <span>เติมเงินในช่วงที่เลือก</span>
              <span className="font-semibold">+{formatMoney(totals.totalTopup)} ฿</span>
            </div>
          )}
        </div>
      )}

      {/* Daily Grouped List */}
      <div className="flex flex-col gap-4">
        {sortedDays.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)] text-sm">
            {hasActiveFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีประวัติการทำรายการ'}
          </div>
        ) : (
          sortedDays.map((day) => {
            const dayTxs = groupedByDay[day];
            const dayExpense = fromSatang(
              dayTxs
                .filter((t) => t.type === 'expense')
                .reduce((s, t) => s + toSatang(t.totalAmount), 0)
            );
            const dayGov = fromSatang(
              dayTxs
                .filter((t) => t.type === 'expense')
                .reduce((s, t) => s + toSatang(t.govAmount), 0)
            );
            const dayUser = fromSatang(
              dayTxs
                .filter((t) => t.type === 'expense')
                .reduce((s, t) => s + toSatang(t.userAmount), 0)
            );

            return (
              <div key={day} className="flex flex-col gap-2">
                <div className="flex justify-between items-end px-1">
                  <h3 className="font-semibold text-sm text-[var(--text-muted)]">
                    {format(parseISO(day), 'd MMMM yyyy', { locale: th })}
                  </h3>
                  {dayExpense > 0 && (
                    <div className="text-right text-xs tabular-nums">
                      <span className="font-semibold">รวม {formatMoney(dayExpense)} ฿</span>{' '}
                      <span className="text-[var(--text-muted)]">
                        (รัฐ <span className="text-[var(--primary-color)]">{formatMoney(dayGov)}</span> / เรา{' '}
                        {formatMoney(dayUser)})
                      </span>
                    </div>
                  )}
                </div>

                {dayTxs.map((tx) => (
                  <SwipeableTransactionItem
                    key={tx.id}
                    tx={tx}
                    onEdit={(id) => navigate(`/add?editId=${id}`)}
                    onDelete={(id) => {
                      deleteTransaction(id);
                      showToast('ลบรายการเรียบร้อยแล้ว', 'info');
                    }}
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
