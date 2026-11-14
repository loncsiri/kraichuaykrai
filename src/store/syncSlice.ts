import type { StateCreator } from 'zustand';
import { syncToGoogleSheets } from '../services/googleSheets';
import type { AppState, PullMode, SyncQueueItem, SyncSlice, Transaction } from './types';
import { roundMoney } from '../utils/money';

export function coalesceSyncQueue(queue: SyncQueueItem[], incoming: SyncQueueItem): SyncQueueItem[] {
  if (incoming.action === 'sync') {
    return [incoming];
  }

  const existingIdx = queue.findIndex((q) => q.id === incoming.id && q.action !== 'sync');
  if (existingIdx === -1) {
    return [...queue, incoming];
  }

  const existing = queue[existingIdx];
  const next = [...queue];

  if (existing.action === 'add' && incoming.action === 'update') {
    next[existingIdx] = { ...existing, payload: incoming.payload, queuedAt: incoming.queuedAt };
    return next;
  }

  if (existing.action === 'add' && incoming.action === 'delete') {
    next.splice(existingIdx, 1);
    return next;
  }

  next[existingIdx] = incoming;
  return next;
}

export async function dispatchSyncOrQueue(
  get: () => AppState,
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  item: SyncQueueItem
) {
  const state = get();
  if (!state.googleSheetsEnabled || !state.googleSheetUrl || !state.googleSecretKey) {
    return;
  }

  set({ syncStatus: 'syncing', syncError: null });

  const result = await syncToGoogleSheets(
    state.googleSheetUrl,
    state.googleSecretKey,
    item.action,
    item.payload
  );

  if (result.success) {
    set({
      syncStatus: 'success',
      syncError: null,
      lastSyncedAt: new Date().toISOString(),
    });
    setTimeout(() => {
      if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
    }, 3000);
    return;
  }

  if (result.isNetworkError) {
    set((s) => ({
      syncStatus: 'error',
      syncError: result.message || 'เครือข่ายขัดข้อง เก็บเข้าคิวรอซิงค์แล้ว',
      syncQueue: coalesceSyncQueue(s.syncQueue, item),
    }));
  } else {
    set({
      syncStatus: 'error',
      syncError: result.message || 'ซิงค์ไม่สำเร็จ',
    });
  }
}

function normalizeRemoteTransaction(raw: Record<string, unknown>): Transaction {
  return {
    id: String(raw.id || ''),
    timestamp: String(raw.timestamp || new Date().toISOString()),
    type: raw.type === 'topup' ? 'topup' : 'expense',
    title: String(raw.title || ''),
    totalAmount: roundMoney(Number(raw.totalAmount) || 0),
    govAmount: roundMoney(Number(raw.govAmount) || 0),
    userAmount: roundMoney(Number(raw.userAmount) || 0),
    govRatio: raw.govRatio !== undefined && raw.govRatio !== '' ? Number(raw.govRatio) : undefined,
    userRatio: raw.userRatio !== undefined && raw.userRatio !== '' ? Number(raw.userRatio) : undefined,
    category: String(raw.category || ''),
    note: String(raw.note || ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export const createSyncSlice: StateCreator<AppState, [], [], SyncSlice> = (set, get) => ({
  googleSheetUrl: '',
  googleSecretKey: '',
  googleSheetsEnabled: false,
  syncStatus: 'idle',
  syncError: null,
  lastSyncedAt: null,
  syncQueue: [],

  setGoogleSheetsConfig: (url, secret, enabled) => {
    set({ googleSheetUrl: url, googleSecretKey: secret, googleSheetsEnabled: enabled });
  },

  clearGoogleSheetsConfig: () => {
    set({
      googleSheetUrl: '',
      googleSecretKey: '',
      googleSheetsEnabled: false,
      syncStatus: 'idle',
      syncError: null,
      lastSyncedAt: null,
      syncQueue: [],
    });
  },

  setSyncStatus: (status, error = null) => set({ syncStatus: status, syncError: error }),

  syncAllToGoogleSheets: async () => {
    const state = get();
    if (!state.googleSheetsEnabled || !state.googleSheetUrl || !state.googleSecretKey) return;

    const active = state.transactions.filter((t) => !t.deletedAt);
    set({ syncStatus: 'syncing', syncError: null });

    const result = await syncToGoogleSheets(
      state.googleSheetUrl,
      state.googleSecretKey,
      'sync',
      active
    );

    if (result.success) {
      set({
        syncStatus: 'success',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
        syncQueue: [],
      });
      setTimeout(() => {
        if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
      }, 3000);
    } else {
      set({
        syncStatus: 'error',
        syncError: result.message || 'ซิงค์ทั้งหมดไม่สำเร็จ',
      });
    }
  },

  pullFromGoogleSheets: async (mode: PullMode = 'merge') => {
    const state = get();
    if (!state.googleSheetsEnabled || !state.googleSheetUrl || !state.googleSecretKey) return null;

    set({ syncStatus: 'syncing', syncError: null });
    const result = await syncToGoogleSheets<{ transactions?: Record<string, unknown>[] }>(
      state.googleSheetUrl,
      state.googleSecretKey,
      'pull',
      null
    );

    if (!result.success || !result.data || !Array.isArray(result.data.transactions)) {
      set({
        syncStatus: 'error',
        syncError: result.message || 'ไม่พบข้อมูลจากการดึงข้อมูล',
      });
      return null;
    }

    const remoteTxs = result.data.transactions
      .map(normalizeRemoteTransaction)
      .filter((t) => t.id && t.title);

    let added = 0;
    let updated = 0;

    if (mode === 'replace') {
      added = remoteTxs.length;
      set({
        transactions: remoteTxs,
        syncStatus: 'success',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      });
    } else {
      const current = get().transactions;
      const map = new Map<string, Transaction>();
      for (const tx of current) {
        map.set(tx.id, tx);
      }

      for (const rTx of remoteTxs) {
        const local = map.get(rTx.id);
        if (!local) {
          map.set(rTx.id, rTx);
          added++;
          continue;
        }

        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        const remoteTime = rTx.updatedAt ? new Date(rTx.updatedAt).getTime() : 0;

        if (local.deletedAt && localTime > remoteTime) {
          continue;
        }
        if (remoteTime >= localTime) {
          map.set(rTx.id, { ...local, ...rTx, deletedAt: undefined });
          updated++;
        }
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      set({
        transactions: merged,
        syncStatus: 'success',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      });
    }

    setTimeout(() => {
      if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
    }, 3000);

    return { added, updated, total: remoteTxs.length };
  },

  flushSyncQueue: async () => {
    const state = get();
    if (
      !state.googleSheetsEnabled ||
      !state.googleSheetUrl ||
      !state.googleSecretKey ||
      state.syncQueue.length === 0
    ) {
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    set({ syncStatus: 'syncing', syncError: null });
    const remaining = [...state.syncQueue];

    while (remaining.length > 0) {
      const currentItem = remaining[0];
      const payload =
        currentItem.action === 'sync'
          ? get().transactions.filter((t) => !t.deletedAt)
          : currentItem.payload;

      const res = await syncToGoogleSheets(
        state.googleSheetUrl,
        state.googleSecretKey,
        currentItem.action,
        payload
      );

      if (res.success) {
        remaining.shift();
        set({
          syncQueue: [...remaining],
          lastSyncedAt: new Date().toISOString(),
        });
      } else if (res.isNetworkError) {
        set({
          syncStatus: 'error',
          syncError: res.message || 'ไม่สามารถเชื่อมต่อเพื่อส่งคิวที่ค้างได้',
        });
        return;
      } else {
        // Permanent error (e.g. wrong secret key) -> keep queue and surface error
        set({
          syncStatus: 'error',
          syncError: res.message || 'คิวซิงค์มีข้อผิดพลาด',
        });
        return;
      }
    }

    set({ syncStatus: 'success', syncError: null });
    setTimeout(() => {
      if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
    }, 3000);
  },
});
