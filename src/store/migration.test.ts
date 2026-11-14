import { describe, it, expect } from 'vitest';
import { migratePersistedState } from './useAppStore';
import { coalesceSyncQueue } from './syncSlice';
import { calculateWalletBalance } from '../utils/calculations';
import type { SyncQueueItem } from './types';

describe('migratePersistedState v1 -> v2', () => {
  it('preserves exact walletBalance via openingBalance and strips dead fields', () => {
    const v1State = {
      walletBalance: 500,
      settings: {
        supportRatioGov: 50,
        supportRatioUser: 50,
        monthlySupportAmount: 1500,
        dailySupportLimit: 150,
        rolloverEnabled: false,
        periodStart: '2026-06',
        periodEnd: '2026-09',
        theme: 'dark',
        categories: ['อาหาร'],
      },
      transactions: [
        {
          id: 'tx-1',
          timestamp: '2026-06-14T10:00:00Z',
          type: 'topup',
          title: 'เติมเงิน',
          totalAmount: 0,
          govAmount: 0,
          userAmount: 300,
          category: '',
          note: '',
        },
      ],
      googleSheetUrl: 'https://example.com/exec',
      googleSecretKey: 'my-secret',
      googleSheetsEnabled: true,
    };

    const migrated = migratePersistedState(v1State, 0);
    expect(migrated.settings?.openingBalance).toBe(200); // 500 - 300 = 200
    expect((migrated.settings as unknown as Record<string, unknown>)?.rolloverEnabled).toBeUndefined();
    expect(migrated.settings?.theme).toBe('dark');
    expect(
      calculateWalletBalance(migrated.transactions || [], migrated.settings?.openingBalance || 0)
    ).toBe(500);
  });
});

describe('coalesceSyncQueue', () => {
  it('merges add + update and cancels add + delete', () => {
    let queue: SyncQueueItem[] = [];
    queue = coalesceSyncQueue(queue, {
      id: 'tx-1',
      action: 'add',
      payload: { id: 'tx-1', title: 'A' },
      queuedAt: '2026-11-14T10:00:00Z',
    });
    queue = coalesceSyncQueue(queue, {
      id: 'tx-1',
      action: 'update',
      payload: { id: 'tx-1', title: 'B' },
      queuedAt: '2026-11-14T10:01:00Z',
    });
    expect(queue).toHaveLength(1);
    expect(queue[0].action).toBe('add');
    expect((queue[0].payload as { title: string }).title).toBe('B');

    queue = coalesceSyncQueue(queue, {
      id: 'tx-1',
      action: 'delete',
      payload: { id: 'tx-1' },
      queuedAt: '2026-11-14T10:02:00Z',
    });
    expect(queue).toHaveLength(0);
  });
});
