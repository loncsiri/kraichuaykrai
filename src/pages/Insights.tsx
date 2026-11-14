import React, { useMemo, useState } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { useActiveTransactions, useAppStore } from '../store/useAppStore';
import { formatMoney, fromSatang, toSatang } from '../utils/money';

const CATEGORY_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
];

export const Insights: React.FC = () => {
  const activeTransactions = useActiveTransactions();
  const settings = useAppStore((s) => s.settings);

  const months = useMemo(() => {
    const set = new Set(activeTransactions.map((t) => format(parseISO(t.timestamp), 'yyyy-MM')));
    return Array.from(set).sort().reverse();
  }, [activeTransactions]);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  const scopedTxs = useMemo(() => {
    if (selectedPeriod === 'all') return activeTransactions;
    return activeTransactions.filter(
      (t) => format(parseISO(t.timestamp), 'yyyy-MM') === selectedPeriod
    );
  }, [activeTransactions, selectedPeriod]);

  const summary = useMemo(() => {
    let totalSpendSatang = 0;
    let govSatang = 0;
    let userSatang = 0;
    let topupSatang = 0;
    const daysWithExpense = new Set<string>();

    for (const tx of scopedTxs) {
      if (tx.type === 'expense') {
        totalSpendSatang += toSatang(tx.totalAmount);
        govSatang += toSatang(tx.govAmount);
        userSatang += toSatang(tx.userAmount);
        daysWithExpense.add(format(parseISO(tx.timestamp), 'yyyy-MM-dd'));
      } else {
        topupSatang += toSatang(tx.userAmount);
      }
    }

    const totalSpend = fromSatang(totalSpendSatang);
    const govPaid = fromSatang(govSatang);
    const userPaid = fromSatang(userSatang);
    const topup = fromSatang(topupSatang);
    const effectiveGovRatio = totalSpendSatang > 0 ? (govSatang / totalSpendSatang) * 100 : 0;
    const avgPerActiveDay =
      daysWithExpense.size > 0 ? fromSatang(Math.round(totalSpendSatang / daysWithExpense.size)) : 0;

    return {
      totalSpend,
      govPaid,
      userPaid,
      topup,
      effectiveGovRatio,
      avgPerActiveDay,
      activeDays: daysWithExpense.size,
    };
  }, [scopedTxs]);

  // Monthly stacked trend (last 6 months sorted ascending)
  const monthlySeries = useMemo(() => {
    const map = new Map<string, { gov: number; user: number }>();
    for (const tx of activeTransactions) {
      if (tx.type !== 'expense') continue;
      const ym = format(parseISO(tx.timestamp), 'yyyy-MM');
      const cur = map.get(ym) || { gov: 0, user: 0 };
      cur.gov += toSatang(tx.govAmount);
      cur.user += toSatang(tx.userAmount);
      map.set(ym, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([ym, v]) => ({
        ym,
        label: format(parseISO(`${ym}-01`), 'MMM yy', { locale: th }),
        gov: fromSatang(v.gov),
        user: fromSatang(v.user),
        total: fromSatang(v.gov + v.user),
      }));
  }, [activeTransactions]);

  // Last 14 days daily gov spend vs daily limit
  const daily14Series = useMemo(() => {
    const today = new Date();
    const dayMap = new Map<string, number>();
    for (const tx of activeTransactions) {
      if (tx.type !== 'expense') continue;
      const key = format(parseISO(tx.timestamp), 'yyyy-MM-dd');
      dayMap.set(key, (dayMap.get(key) || 0) + toSatang(tx.govAmount));
    }

    const items = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      items.push({
        key,
        label: format(d, 'd/M'),
        govSpent: fromSatang(dayMap.get(key) || 0),
      });
    }
    return items;
  }, [activeTransactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let grandSatang = 0;
    for (const tx of scopedTxs) {
      if (tx.type !== 'expense') continue;
      const cat = tx.category || 'ไม่ระบุหมวด';
      const amt = toSatang(tx.totalAmount);
      map.set(cat, (map.get(cat) || 0) + amt);
      grandSatang += amt;
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, satang], idx) => ({
        category,
        amount: fromSatang(satang),
        percent: grandSatang > 0 ? (satang / grandSatang) * 100 : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }));
  }, [scopedTxs]);

  const maxMonthlyTotal = Math.max(1, ...monthlySeries.map((m) => m.total));
  const maxDailyGov = Math.max(
    settings.dailySupportLimit || 1,
    ...daily14Series.map((d) => d.govSpent)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-xl">สรุปและวิเคราะห์</h2>
        <select
          aria-label="เลือกเดือนที่ต้องการวิเคราะห์"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="input-field !w-auto !py-1.5 !px-3 text-sm"
        >
          <option value="all">ทุกเดือน</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: th })}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-[var(--text-muted)]">ประหยัดจากรัฐสะสม</div>
          <div className="text-2xl font-bold text-[var(--primary-color)] tabular-nums mt-1">
            {formatMoney(summary.govPaid)} ฿
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            คิดเป็น {summary.effectiveGovRatio.toFixed(1)}% ของยอดซื้อ
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-[var(--text-muted)]">เราจ่ายจริง</div>
          <div className="text-2xl font-bold tabular-nums mt-1">
            {formatMoney(summary.userPaid)} ฿
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            ยอดรวมทั้งหมด {formatMoney(summary.totalSpend)} ฿
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-[var(--text-muted)]">เฉลี่ยต่อวันที่ใช้จ่าย</div>
          <div className="text-xl font-bold tabular-nums mt-1">
            {formatMoney(summary.avgPerActiveDay)} ฿
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            ใช้งาน {summary.activeDays} วัน
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-[var(--text-muted)]">ยอดเติมเงินรวม</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {formatMoney(summary.topup)} ฿
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {scopedTxs.length} รายการทั้งหมด
          </div>
        </div>
      </div>

      {/* 14-Day Gov Quota Usage Chart (SVG) */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">สิทธิ์รัฐที่ใช้วันต่อวัน (14 วันล่าสุด)</h3>
          <span className="text-xs text-[var(--text-muted)]">
            เส้นประ = ลิมิต {formatMoney(settings.dailySupportLimit)} ฿
          </span>
        </div>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 420 150"
            className="w-full h-40 overflow-visible"
            role="img"
            aria-label="กราฟการใช้สิทธิ์รัฐ 14 วันล่าสุด"
          >
            {/* Daily Limit Reference Line */}
            {settings.dailySupportLimit > 0 && (
              <line
                x1={0}
                x2={420}
                y1={120 - (settings.dailySupportLimit / maxDailyGov) * 105}
                y2={120 - (settings.dailySupportLimit / maxDailyGov) * 105}
                stroke="var(--warning-color)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}

            {daily14Series.map((item, idx) => {
              const barW = 20;
              const gap = 10;
              const x = idx * (barW + gap) + 4;
              const h = Math.max(2, (item.govSpent / maxDailyGov) * 105);
              const y = 120 - h;
              return (
                <g key={item.key}>
                  <rect
                    x={x}
                    y={item.govSpent > 0 ? y : 118}
                    width={barW}
                    height={item.govSpent > 0 ? h : 2}
                    rx={4}
                    fill={
                      item.govSpent >= settings.dailySupportLimit && settings.dailySupportLimit > 0
                        ? '#10b981'
                        : 'var(--primary-color)'
                    }
                    opacity={item.govSpent > 0 ? 0.9 : 0.25}
                  >
                    <title>
                      {item.key}: รัฐช่วย {formatMoney(item.govSpent)} บาท
                    </title>
                  </rect>
                  {idx % 2 === 0 && (
                    <text
                      x={x + barW / 2}
                      y={138}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--text-muted)"
                    >
                      {item.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Monthly Stacked Trend */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">แนวโน้มรายเดือน (รัฐ vs เรา)</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--primary-color)] inline-block" />
              รัฐ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
              เรา
            </span>
          </div>
        </div>

        {monthlySeries.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">
            ยังไม่มีข้อมูลรายจ่ายเพียงพอสำหรับแสดงกราฟ
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {monthlySeries.map((m) => {
              const govW = (m.gov / maxMonthlyTotal) * 100;
              const userW = (m.user / maxMonthlyTotal) * 100;
              return (
                <div key={m.ym}>
                  <div className="flex justify-between text-xs mb-1 tabular-nums">
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-[var(--text-muted)]">
                      รวม {formatMoney(m.total)} ฿ (รัฐ {formatMoney(m.gov)} / เรา{' '}
                      {formatMoney(m.user)})
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-[var(--primary-color)]"
                      style={{ width: `${govW}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${userW}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="card p-4">
        <h3 className="font-bold text-base mb-3">สัดส่วนตามหมวดหมู่</h3>
        {categoryBreakdown.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--text-muted)]">
            ไม่มีข้อมูลหมวดหมู่ในช่วงเวลาที่เลือก
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {categoryBreakdown.map((c) => (
              <div key={c.category}>
                <div className="flex justify-between text-sm mb-1 tabular-nums">
                  <span className="font-medium flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.category}
                  </span>
                  <span>
                    <span className="font-bold">{formatMoney(c.amount)} ฿</span>{' '}
                    <span className="text-xs text-[var(--text-muted)]">
                      ({c.percent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.percent}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
