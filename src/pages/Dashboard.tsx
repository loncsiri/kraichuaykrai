import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiPlus,
  FiShoppingBag,
  FiSliders,
  FiZap,
} from 'react-icons/fi';
import { format, parse, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  useActiveTransactions,
  useAppStore,
  useWalletBalance,
} from '../store/useAppStore';
import {
  calculateProjectMetrics,
  calculateRemainingGov,
} from '../utils/calculations';
import { formatMoney, roundMoney } from '../utils/money';

function formatMonthLabel(ym: string): string {
  try {
    return format(parse(ym, 'yyyy-MM', new Date()), 'MMM yy', { locale: th });
  } catch {
    return ym;
  }
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-rose-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-[var(--primary-color)]';
}

export const Dashboard: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const templates = useAppStore((s) => s.templates);
  const activeTransactions = useActiveTransactions();
  const walletBalance = useWalletBalance();
  const navigate = useNavigate();

  const {
    govSpentMonthly,
    remainingGovMonthly,
    govSpentDaily,
    remainingGovDaily,
    availableGovToday,
  } = calculateRemainingGov({ transactions: activeTransactions, settings });

  const projectMetrics = calculateProjectMetrics({
    transactions: activeTransactions,
    settings,
  });

  const govRatioFrac = settings.supportRatioGov / 100;
  const maxPurchaseToday =
    projectMetrics.isWithinPeriod && govRatioFrac > 0
      ? roundMoney(availableGovToday / govRatioFrac)
      : 0;
  const reqWalletToday = roundMoney(Math.max(0, maxPurchaseToday - availableGovToday));
  const walletShortfall = roundMoney(Math.max(0, reqWalletToday - walletBalance));

  const dailyLimit = settings.dailySupportLimit;
  const dailyPercent = dailyLimit > 0 ? Math.min(100, (govSpentDaily / dailyLimit) * 100) : 0;

  const monthlyLimit = settings.monthlySupportAmount;
  const monthlyPercent =
    monthlyLimit > 0 ? Math.min(100, (govSpentMonthly / monthlyLimit) * 100) : 0;

  const recentTransactions = [...activeTransactions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      {/* Alerts & Warnings */}
      {!projectMetrics.isWithinPeriod && (
        <div className="card p-3.5 border-amber-500/50 bg-amber-500/10 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-sm">
            <FiAlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
            <div>
              <div className="font-semibold text-amber-800 dark:text-amber-300">
                วันนี้อยู่นอกช่วงเวลาโครงการ ({formatMonthLabel(settings.periodStart)} –{' '}
                {formatMonthLabel(settings.periodEnd)})
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                รายการที่บันทึกวันนี้จะไม่หักสิทธิ์รัฐ อัปเดตช่วงโครงการได้ในหน้าตั้งค่า
              </div>
            </div>
          </div>
          <Link
            to="/settings"
            className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 no-underline"
          >
            ตั้งค่า
          </Link>
        </div>
      )}

      {projectMetrics.isWithinPeriod && (dailyPercent >= 80 || monthlyPercent >= 80) && (
        <div
          className={`card p-3 flex items-center gap-2.5 text-sm ${
            dailyPercent >= 100 || monthlyPercent >= 100
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          }`}
        >
          <FiAlertTriangle className="shrink-0" size={17} />
          <span className="font-medium">
            {monthlyPercent >= 100
              ? 'ใช้สิทธิ์รัฐรายเดือนครบ 100% แล้ว'
              : dailyPercent >= 100
              ? 'ใช้สิทธิ์รัฐรายวันครบ 100% แล้ว'
              : monthlyPercent >= 80
              ? `สิทธิ์รายเดือนใกล้เต็มแล้ว (ใช้ไป ${monthlyPercent.toFixed(0)}%)`
              : `สิทธิ์รายวันใกล้เต็มแล้ว (ใช้ไป ${dailyPercent.toFixed(0)}%)`}
          </span>
        </div>
      )}

      {/* Hero Quota Card */}
      <section
        aria-label="สิทธิ์ที่ใช้วันนี้"
        className="rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-blue-100 text-sm font-medium">
              วันนี้ใช้สิทธิ์รัฐได้อีก (สัดส่วน {settings.supportRatioGov}:{settings.supportRatioUser})
            </div>
            <div className="text-4xl font-bold tabular-nums mt-1 tracking-tight">
              {projectMetrics.isWithinPeriod ? formatMoney(availableGovToday) : '0.00'}{' '}
              <span className="text-lg font-medium text-blue-100">บาท</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold backdrop-blur-xs cursor-pointer transition shrink-0"
          >
            + จดรายการ
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/20">
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-xs text-blue-100">ซื้อสินค้าได้สูงสุดวันนี้</div>
            <div className="font-bold text-lg tabular-nums mt-0.5">
              {formatMoney(maxPurchaseToday)} ฿
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="text-xs text-blue-100">เราต้องมีเงินจ่าย</div>
            <div className="font-bold text-lg tabular-nums mt-0.5">
              {formatMoney(reqWalletToday)} ฿
            </div>
          </div>
        </div>

        {projectMetrics.isWithinPeriod && availableGovToday > 0 && (
          <div className="mt-3 text-xs flex items-center gap-1.5 text-blue-100">
            {walletShortfall === 0 ? (
              <>
                <FiCheckCircle className="text-emerald-300 shrink-0" />
                <span>เงินในกระเป๋าเพียงพอสำหรับใช้สิทธิ์เต็มจำนวนวันนี้</span>
              </>
            ) : (
              <>
                <FiAlertTriangle className="text-amber-300 shrink-0" />
                <span>หากต้องการใช้สิทธิ์ให้เต็มวันนี้ ควรเติมเงินอีก {formatMoney(walletShortfall)} บาท</span>
              </>
            )}
          </div>
        )}
      </section>

      {/* Wallet Balance Card */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <FiCreditCard size={14} />
            <span>เงินในกระเป๋าเรา (คำนวณจากรายการจริง)</span>
          </div>
          <div className="font-bold text-2xl tabular-nums mt-0.5">
            {formatMoney(walletBalance)} <span className="text-base font-medium">บาท</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/add?type=topup')}
          className="btn-primary !rounded-full !px-4 !py-2 text-sm shrink-0"
        >
          <FiPlus size={16} />
          เติมเงิน
        </button>
      </div>

      {/* Daily & Monthly Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-base">โควตารายวัน</h2>
            <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
              {dailyPercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden mb-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(dailyPercent)}`}
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)] tabular-nums">
            <span>ใช้ไป {formatMoney(govSpentDaily)} ฿</span>
            <span>ลิมิต {formatMoney(dailyLimit)} ฿</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] flex justify-between text-xs tabular-nums">
            <span className="text-[var(--text-muted)]">คงเหลือวันนี้</span>
            <span className="font-bold text-[var(--primary-color)]">
              {formatMoney(remainingGovDaily)} ฿
            </span>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-base">โควตารายเดือน</h2>
            <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
              {monthlyPercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden mb-2.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(monthlyPercent)}`}
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--text-muted)] tabular-nums">
            <span>ใช้ไป {formatMoney(govSpentMonthly)} ฿</span>
            <span>ลิมิต {formatMoney(monthlyLimit)} ฿</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--card-border)] flex justify-between text-xs tabular-nums">
            <span className="text-[var(--text-muted)]">คงเหลือเดือนนี้</span>
            <span className="font-bold text-[var(--primary-color)]">
              {formatMoney(remainingGovMonthly)} ฿
            </span>
          </div>
        </div>
      </div>

      {/* Project Duration & Overall Budget */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <FiCalendar className="text-[var(--primary-color)]" size={16} />
            <span>
              ภาพรวมโครงการ ({formatMonthLabel(settings.periodStart)} –{' '}
              {formatMonthLabel(settings.periodEnd)})
            </span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-[var(--primary-color)] font-semibold">
            {projectMetrics.daysRemaining > 0
              ? `เหลือ ${projectMetrics.daysRemaining} วัน`
              : 'สิ้นสุดแล้ว'}
          </span>
        </div>

        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/70 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${projectMetrics.projectPercentUsed}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-[var(--text-muted)] tabular-nums">
          <span>
            รัฐช่วยแล้วรวม {formatMoney(projectMetrics.totalGovSpentInPeriod)} ฿ (
            {projectMetrics.projectPercentUsed.toFixed(1)}%)
          </span>
          <span>งบทั้งโครงการ {formatMoney(projectMetrics.totalProjectBudget)} ฿</span>
        </div>
      </div>

      {/* Quick Templates */}
      {templates.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <FiZap className="text-amber-500" size={15} />
              <span>รายการประจำด่วน</span>
            </div>
            <Link to="/settings" className="text-xs text-[var(--primary-color)] no-underline">
              จัดการ
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => navigate(`/add?templateId=${tpl.id}`)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--surface-muted)] border border-[var(--card-border)] hover:border-[var(--primary-color)] cursor-pointer transition"
              >
                {tpl.title} · <span className="font-bold tabular-nums">{formatMoney(tpl.amount)} ฿</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* First-Time Quick Checklist */}
      {activeTransactions.length === 0 && (
        <div className="card p-4 border-dashed border-2 border-[var(--primary-color)]/40">
          <h3 className="font-bold text-base mb-2">เริ่มต้นใช้งานอย่างรวดเร็ว</h3>
          <div className="flex flex-col gap-2 text-sm">
            <Link
              to="/settings"
              className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] no-underline text-inherit hover:opacity-90"
            >
              <span className="flex items-center gap-2">
                <FiSliders className="text-[var(--primary-color)]" />
                1. ตรวจสัดส่วนและช่วงเวลาโครงการ
              </span>
              <span className="text-xs text-[var(--primary-color)] font-semibold">ตั้งค่า →</span>
            </Link>
            <Link
              to="/add?type=topup"
              className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] no-underline text-inherit hover:opacity-90"
            >
              <span className="flex items-center gap-2">
                <FiPlus className="text-emerald-500" />
                2. เติมเงินเข้ากระเป๋า (หรือใส่ยอดตั้งต้น)
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                เติมเงิน →
              </span>
            </Link>
            <Link
              to="/add"
              className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-muted)] no-underline text-inherit hover:opacity-90"
            >
              <span className="flex items-center gap-2">
                <FiShoppingBag className="text-rose-500" />
                3. สแกนสลิปหรือบันทึกรายจ่ายแรก
              </span>
              <span className="text-xs text-[var(--primary-color)] font-semibold">บันทึก →</span>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h2 className="font-bold text-base">รายการล่าสุด</h2>
          <Link
            to="/history"
            className="text-sm font-semibold text-[var(--primary-color)] no-underline"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="card p-6 text-center text-[var(--text-muted)] flex flex-col items-center gap-2">
            <FiClock size={26} />
            <div className="text-sm">ยังไม่มีรายการใช้จ่าย</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentTransactions.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => navigate(`/add?editId=${tx.id}`)}
                className="card p-3.5 flex items-center justify-between gap-3 text-left w-full cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'topup'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'topup' ? <FiPlus size={18} /> : <FiShoppingBag size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{tx.title}</div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
                      <span>{format(parseISO(tx.timestamp), 'd MMM HH:mm', { locale: th })}</span>
                      {tx.category && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[11px]">
                          {tx.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <div
                    className={`font-bold text-base ${
                      tx.type === 'topup' ? 'text-emerald-600 dark:text-emerald-400' : ''
                    }`}
                  >
                    {tx.type === 'topup' ? '+' : '-'}
                    {formatMoney(tx.type === 'topup' ? tx.userAmount : tx.totalAmount)} ฿
                  </div>
                  {tx.type === 'expense' && (
                    <div className="text-[11px] text-[var(--text-muted)]">
                      รัฐ <span className="text-[var(--primary-color)] font-semibold">{formatMoney(tx.govAmount)}</span> · เรา{' '}
                      <span className="font-semibold text-[var(--text-color)]">{formatMoney(tx.userAmount)}</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
