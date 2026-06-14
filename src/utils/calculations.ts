import type { AppState } from '../store/useAppStore';
import { isSameMonth, parseISO, isSameDay, startOfMonth, endOfMonth, parse } from 'date-fns';

export function isDateWithinPeriod(dateStr: string, periodStart: string, periodEnd: string) {
  if (!periodStart || !periodEnd) return true;
  
  try {
    const start = parse(periodStart, 'yyyy-MM', new Date());
    const startPeriod = startOfMonth(start);
    
    const end = parse(periodEnd, 'yyyy-MM', new Date());
    const endPeriod = endOfMonth(end);
    
    const d = new Date(dateStr);
    return d >= startPeriod && d <= endPeriod;
  } catch (e) {
    return true; // Fallback if format is weird
  }
}

export function calculateRemainingGov(state: AppState, targetDateStr?: string, excludeTxId?: string) {
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  
  // Get all expenses
  const expenses = state.transactions.filter(t => t.type === 'expense' && t.id !== excludeTxId);

  // 1. Calculate Monthly Spent
  const monthlyExpenses = expenses.filter(t => {
    const d = parseISO(t.timestamp);
    return isSameMonth(d, targetDate);
  });
  
  const govSpentMonthly = monthlyExpenses.reduce((sum, t) => sum + t.govAmount, 0);
  const remainingGovMonthly = Math.max(0, state.settings.monthlySupportAmount - govSpentMonthly);

  // 2. Calculate Daily Spent
  const dailyExpenses = expenses.filter(t => {
    const d = parseISO(t.timestamp);
    return isSameDay(d, targetDate);
  });
  
  const govSpentDaily = dailyExpenses.reduce((sum, t) => sum + t.govAmount, 0);
  const remainingGovDaily = Math.max(0, state.settings.dailySupportLimit - govSpentDaily);

  // Return both
  return {
    govSpentMonthly,
    remainingGovMonthly,
    govSpentDaily,
    remainingGovDaily,
    availableGovToday: Math.min(remainingGovMonthly, remainingGovDaily)
  };
}

export function calculateTransactionSplit(amount: number, availableGovToday: number, state: AppState) {
  const govRatio = state.settings.supportRatioGov / 100;
  
  const expectedGov = amount * govRatio;
  
  // Actual government amount is capped by the available support today
  const actualGov = Math.min(expectedGov, availableGovToday);
  
  // User pays the rest
  const actualUser = amount - actualGov;

  return {
    govAmount: actualGov,
    userAmount: actualUser
  };
}

export function calculateMaxPurchasingPower(availableGovToday: number, walletBalance: number, state: AppState) {
  const govRatio = state.settings.supportRatioGov / 100;
  // If no gov ratio, buying power is just wallet
  if (govRatio === 0) return walletBalance;
  
  // Max we can buy if we use UP TO availableGovToday
  // amount * govRatio = availableGovToday => amount = availableGovToday / govRatio
  const maxAmountFromGov = availableGovToday / govRatio;
  const userShareForMaxGov = maxAmountFromGov - availableGovToday;
  
  if (walletBalance >= userShareForMaxGov) {
    // If we have enough wallet balance to match the full gov support, plus any extra from our wallet
    const extraWallet = walletBalance - userShareForMaxGov;
    return maxAmountFromGov + extraWallet;
  } else {
    // If our wallet limits the purchasing power before we max out the gov support
    // amount * (1 - govRatio) = walletBalance => amount = walletBalance / (1 - govRatio)
    const userRatio = state.settings.supportRatioUser / 100;
    return walletBalance / userRatio;
  }
}
