import type { Settings, Transaction } from '../store/types';
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { fromSatang, roundMoney, toSatang } from './money';

export interface CalcInput {
  transactions: Transaction[];
  settings: Pick<
    Settings,
    | 'supportRatioGov'
    | 'supportRatioUser'
    | 'monthlySupportAmount'
    | 'dailySupportLimit'
    | 'periodStart'
    | 'periodEnd'
    | 'openingBalance'
  >;
}

function parseFlexibleDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = parse(dateStr, 'yyyy-MM-dd', new Date());
    if (isValid(d)) return d;
  }
  const iso = parseISO(dateStr);
  if (isValid(iso)) return iso;
  const fallback = new Date(dateStr);
  return isValid(fallback) ? fallback : new Date();
}

function extractYearMonth(dateStr: string): string | null {
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.slice(0, 7);
  const parsed = parseISO(dateStr);
  if (isValid(parsed)) return format(parsed, 'yyyy-MM');
  return null;
}

export function isDateWithinPeriod(
  dateStr: string,
  periodStart: string,
  periodEnd: string
): boolean {
  if (!periodStart || !periodEnd) return true;
  const ym = extractYearMonth(dateStr);
  if (!ym) return true;
  const start = periodStart <= periodEnd ? periodStart : periodEnd;
  const end = periodStart <= periodEnd ? periodEnd : periodStart;
  return ym >= start && ym <= end;
}

export function calculateWalletBalance(
  transactions: Transaction[],
  openingBalance = 0
): number {
  let balanceSatang = toSatang(openingBalance);
  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    const amtSatang = toSatang(tx.userAmount);
    if (tx.type === 'topup') {
      balanceSatang += amtSatang;
    } else if (tx.type === 'expense') {
      balanceSatang -= amtSatang;
    }
  }
  return fromSatang(balanceSatang);
}

export function calculateRemainingGov(
  state: CalcInput,
  targetDateStr?: string,
  excludeTxId?: string
) {
  const targetDate = parseFlexibleDate(targetDateStr);

  const expenses = state.transactions.filter(
    (t) => t.type === 'expense' && !t.deletedAt && t.id !== excludeTxId
  );

  let govSpentMonthlySatang = 0;
  let govSpentDailySatang = 0;

  for (const tx of expenses) {
    const d = parseISO(tx.timestamp);
    if (!isValid(d)) continue;
    const govSatang = toSatang(tx.govAmount);
    if (isSameMonth(d, targetDate)) {
      govSpentMonthlySatang += govSatang;
    }
    if (isSameDay(d, targetDate)) {
      govSpentDailySatang += govSatang;
    }
  }

  const monthlyLimitSatang = toSatang(state.settings.monthlySupportAmount);
  const dailyLimitSatang = toSatang(state.settings.dailySupportLimit);

  const remainingGovMonthlySatang = Math.max(0, monthlyLimitSatang - govSpentMonthlySatang);
  const remainingGovDailySatang = Math.max(0, dailyLimitSatang - govSpentDailySatang);
  const availableGovTodaySatang = Math.min(remainingGovMonthlySatang, remainingGovDailySatang);

  return {
    govSpentMonthly: fromSatang(govSpentMonthlySatang),
    remainingGovMonthly: fromSatang(remainingGovMonthlySatang),
    govSpentDaily: fromSatang(govSpentDailySatang),
    remainingGovDaily: fromSatang(remainingGovDailySatang),
    availableGovToday: fromSatang(availableGovTodaySatang),
  };
}

export function calculateTransactionSplit(
  amount: number,
  availableGovToday: number,
  state: Pick<CalcInput, 'settings'>
) {
  const amountSatang = Math.max(0, toSatang(amount));
  const availableSatang = Math.max(0, toSatang(availableGovToday));
  const govRatio = Math.max(0, Math.min(100, state.settings.supportRatioGov));

  const expectedGovSatang = Math.round((amountSatang * govRatio) / 100);
  const actualGovSatang = Math.min(expectedGovSatang, availableSatang);
  const actualUserSatang = amountSatang - actualGovSatang;

  return {
    govAmount: fromSatang(actualGovSatang),
    userAmount: fromSatang(actualUserSatang),
  };
}

export function calculateMaxPurchasingPower(
  availableGovToday: number,
  walletBalance: number,
  state: Pick<CalcInput, 'settings'>
) {
  const govRatio = state.settings.supportRatioGov / 100;
  if (govRatio <= 0) return roundMoney(Math.max(0, walletBalance));
  if (govRatio >= 1) return roundMoney(availableGovToday + Math.max(0, walletBalance));

  const maxAmountFromGov = availableGovToday / govRatio;
  const userShareForMaxGov = maxAmountFromGov - availableGovToday;

  if (walletBalance >= userShareForMaxGov) {
    const extraWallet = walletBalance - userShareForMaxGov;
    return roundMoney(maxAmountFromGov + extraWallet);
  }
  const userRatio = 1 - govRatio;
  return roundMoney(Math.max(0, walletBalance) / userRatio);
}

export interface ProjectMetrics {
  totalMonths: number;
  totalProjectBudget: number;
  totalGovSpentInPeriod: number;
  projectPercentUsed: number;
  daysRemaining: number;
  monthsRemaining: number;
  isWithinPeriod: boolean;
  isBeforePeriod: boolean;
  isAfterPeriod: boolean;
}

export function calculateProjectMetrics(
  state: CalcInput,
  referenceDate: Date = new Date()
): ProjectMetrics {
  const { periodStart, periodEnd, monthlySupportAmount } = state.settings;
  const today = startOfDay(referenceDate);
  const todayStr = format(today, 'yyyy-MM-dd');

  const startParsed = parse(periodStart, 'yyyy-MM', new Date());
  const endParsed = parse(periodEnd, 'yyyy-MM', new Date());

  if (!isValid(startParsed) || !isValid(endParsed)) {
    return {
      totalMonths: 1,
      totalProjectBudget: roundMoney(monthlySupportAmount),
      totalGovSpentInPeriod: 0,
      projectPercentUsed: 0,
      daysRemaining: 0,
      monthsRemaining: 0,
      isWithinPeriod: true,
      isBeforePeriod: false,
      isAfterPeriod: false,
    };
  }

  const periodStartDate = startOfMonth(startParsed <= endParsed ? startParsed : endParsed);
  const periodEndDate = endOfMonth(startParsed <= endParsed ? endParsed : startParsed);

  const totalMonths = Math.max(
    1,
    differenceInCalendarMonths(startOfMonth(periodEndDate), startOfMonth(periodStartDate)) + 1
  );
  const totalProjectBudget = roundMoney(monthlySupportAmount * totalMonths);

  let govSpentSatang = 0;
  for (const tx of state.transactions) {
    if (tx.type !== 'expense' || tx.deletedAt) continue;
    if (isDateWithinPeriod(tx.timestamp, periodStart, periodEnd)) {
      govSpentSatang += toSatang(tx.govAmount);
    }
  }
  const totalGovSpentInPeriod = fromSatang(govSpentSatang);
  const projectPercentUsed =
    totalProjectBudget > 0 ? Math.min(100, (totalGovSpentInPeriod / totalProjectBudget) * 100) : 0;

  const isBeforePeriod = today < periodStartDate;
  const isAfterPeriod = today > periodEndDate;
  const isWithinPeriod = isDateWithinPeriod(todayStr, periodStart, periodEnd);

  const daysRemaining = isAfterPeriod
    ? 0
    : Math.max(0, differenceInCalendarDays(periodEndDate, isBeforePeriod ? periodStartDate : today) + 1);

  const monthsRemaining = isAfterPeriod
    ? 0
    : Math.max(
        0,
        differenceInCalendarMonths(
          startOfMonth(periodEndDate),
          startOfMonth(isBeforePeriod ? periodStartDate : today)
        ) + 1
      );

  return {
    totalMonths,
    totalProjectBudget,
    totalGovSpentInPeriod,
    projectPercentUsed,
    daysRemaining,
    monthsRemaining,
    isWithinPeriod,
    isBeforePeriod,
    isAfterPeriod,
  };
}
