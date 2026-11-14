import { describe, it, expect } from 'vitest';
import {
  calculateMaxPurchasingPower,
  calculateProjectMetrics,
  calculateRemainingGov,
  calculateTransactionSplit,
  calculateWalletBalance,
  isDateWithinPeriod,
  type CalcInput,
} from './calculations';
import { roundMoney, toSatang, fromSatang } from './money';
import type { Transaction } from '../store/types';

function makeState(overrides?: Partial<CalcInput>): CalcInput {
  return {
    transactions: [],
    settings: {
      supportRatioGov: 60,
      supportRatioUser: 40,
      monthlySupportAmount: 1000,
      dailySupportLimit: 200,
      periodStart: '2026-10',
      periodEnd: '2026-12',
      openingBalance: 0,
    },
    ...overrides,
  };
}

function makeTx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id || 'tx-1',
    timestamp: partial.timestamp || '2026-11-10T10:00:00.000Z',
    type: partial.type || 'expense',
    title: partial.title || 'Test',
    totalAmount: partial.totalAmount ?? 100,
    govAmount: partial.govAmount ?? 60,
    userAmount: partial.userAmount ?? 40,
    category: partial.category || 'อาหารและเครื่องดื่ม',
    note: partial.note || '',
    ...partial,
  };
}

describe('money helpers', () => {
  it('eliminates IEEE-754 drift', () => {
    const sum = 0.1 + 0.2;
    expect(roundMoney(sum)).toBe(0.3);
    expect(fromSatang(toSatang(239.99999999999997))).toBe(240);
  });
});

describe('isDateWithinPeriod', () => {
  it('validates YYYY-MM-DD against period range', () => {
    expect(isDateWithinPeriod('2026-10-01', '2026-10', '2026-12')).toBe(true);
    expect(isDateWithinPeriod('2026-12-31', '2026-10', '2026-12')).toBe(true);
    expect(isDateWithinPeriod('2026-09-30', '2026-10', '2026-12')).toBe(false);
    expect(isDateWithinPeriod('2027-01-01', '2026-10', '2026-12')).toBe(false);
  });
});

describe('calculateRemainingGov & split', () => {
  it('calculates quota for specific target date instead of today', () => {
    const state = makeState({
      transactions: [
        makeTx({
          id: 'tx-nov-10',
          timestamp: '2026-11-10T09:00:00.000+07:00',
          totalAmount: 200,
          govAmount: 120,
          userAmount: 80,
        }),
        makeTx({
          id: 'tx-nov-11',
          timestamp: '2026-11-11T09:00:00.000+07:00',
          totalAmount: 100,
          govAmount: 60,
          userAmount: 40,
        }),
      ],
    });

    const nov10 = calculateRemainingGov(state, '2026-11-10');
    expect(nov10.govSpentDaily).toBe(120);
    expect(nov10.remainingGovDaily).toBe(80);
    expect(nov10.govSpentMonthly).toBe(180);
    expect(nov10.remainingGovMonthly).toBe(820);
    expect(nov10.availableGovToday).toBe(80);

    const nov12 = calculateRemainingGov(state, '2026-11-12');
    expect(nov12.govSpentDaily).toBe(0);
    expect(nov12.remainingGovDaily).toBe(200);
    expect(nov12.availableGovToday).toBe(200);
  });

  it('caps govAmount at availableGovToday and sums exactly', () => {
    const state = makeState();
    const split = calculateTransactionSplit(100, 35.55, state);
    expect(split.govAmount).toBe(35.55);
    expect(split.userAmount).toBe(64.45);
    expect(roundMoney(split.govAmount + split.userAmount)).toBe(100);
  });

  it('ignores soft-deleted transactions', () => {
    const state = makeState({
      transactions: [
        makeTx({
          id: 'tx-del',
          timestamp: '2026-11-10T09:00:00.000+07:00',
          govAmount: 150,
          userAmount: 100,
          deletedAt: '2026-11-10T10:00:00.000Z',
        }),
      ],
    });
    const res = calculateRemainingGov(state, '2026-11-10');
    expect(res.govSpentDaily).toBe(0);
    expect(res.remainingGovDaily).toBe(200);
  });

  it('excludes edited transaction when excludeTxId is provided', () => {
    const state = makeState({
      transactions: [
        makeTx({
          id: 'tx-edit',
          timestamp: '2026-11-10T09:00:00.000+07:00',
          govAmount: 120,
          userAmount: 80,
        }),
      ],
    });
    const res = calculateRemainingGov(state, '2026-11-10', 'tx-edit');
    expect(res.govSpentDaily).toBe(0);
    expect(res.availableGovToday).toBe(200);
  });
});

describe('calculateWalletBalance', () => {
  it('derives exact wallet balance without floating point error', () => {
    const txs: Transaction[] = [
      makeTx({ id: '1', type: 'topup', totalAmount: 0, govAmount: 0, userAmount: 500 }),
      makeTx({ id: '2', type: 'expense', totalAmount: 300, govAmount: 180, userAmount: 120.33 }),
      makeTx({ id: '3', type: 'expense', totalAmount: 200, govAmount: 60, userAmount: 139.67 }),
      makeTx({
        id: '4',
        type: 'expense',
        totalAmount: 100,
        govAmount: 60,
        userAmount: 40,
        deletedAt: '2026-11-10T12:00:00.000Z',
      }),
    ];
    expect(calculateWalletBalance(txs, 0)).toBe(240);
    expect(calculateWalletBalance(txs, 100)).toBe(340);
  });
});

describe('calculateMaxPurchasingPower', () => {
  it('computes max purchasing power when wallet matches or exceeds subsidy', () => {
    const state = makeState();
    // availableGov = 200, ratio = 60% -> maxFromGov = 333.33, userShare = 133.33
    const powerRich = calculateMaxPurchasingPower(200, 200, state);
    expect(powerRich).toBeCloseTo(400, 1);

    // wallet = 40, userRatio = 40% -> power = 100
    const powerLimited = calculateMaxPurchasingPower(200, 40, state);
    expect(powerLimited).toBe(100);
  });
});

describe('calculateProjectMetrics', () => {
  it('counts months, total budget, and remaining days', () => {
    const state = makeState({
      transactions: [
        makeTx({ id: '1', timestamp: '2026-11-05T10:00:00+07:00', govAmount: 300 }),
        makeTx({ id: '2', timestamp: '2026-09-05T10:00:00+07:00', govAmount: 200 }), // outside period
      ],
    });
    const metrics = calculateProjectMetrics(state, new Date('2026-11-14T10:00:00+07:00'));
    expect(metrics.totalMonths).toBe(3); // Oct, Nov, Dec
    expect(metrics.totalProjectBudget).toBe(3000);
    expect(metrics.totalGovSpentInPeriod).toBe(300);
    expect(metrics.projectPercentUsed).toBe(10);
    expect(metrics.isWithinPeriod).toBe(true);
    expect(metrics.daysRemaining).toBe(48); // Nov 14..30 (17) + Dec 1..31 (31)
    expect(metrics.monthsRemaining).toBe(2); // Nov, Dec
  });
});
