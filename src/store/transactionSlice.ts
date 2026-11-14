import type { StateCreator } from 'zustand';
import type { AppState, Transaction, TransactionSlice } from './types';
import { dispatchSyncOrQueue } from './syncSlice';
import { createDefaultSettings } from './settingsSlice';
import { roundMoney } from '../utils/money';
import { clearAllSlipImages, deleteSlipImage } from '../utils/slipStorage';

function normalizeTransactionAmounts(tx: Omit<Transaction, 'id'>): Omit<Transaction, 'id'> {
  return {
    ...tx,
    totalAmount: roundMoney(tx.totalAmount),
    govAmount: roundMoney(tx.govAmount),
    userAmount: roundMoney(tx.userAmount),
  };
}

export const createTransactionSlice: StateCreator<AppState, [], [], TransactionSlice> = (set, get) => ({
  transactions: [],

  addTransaction: (txData) => {
    const id = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const normalized = normalizeTransactionAmounts(txData);

    const newTx: Transaction = {
      ...normalized,
      id,
      govRatio:
        normalized.govRatio !== undefined
          ? normalized.govRatio
          : normalized.type === 'expense'
          ? get().settings.supportRatioGov
          : undefined,
      userRatio:
        normalized.userRatio !== undefined
          ? normalized.userRatio
          : normalized.type === 'expense'
          ? get().settings.supportRatioUser
          : undefined,
      updatedAt: nowIso,
    };

    set((state) => ({
      transactions: [newTx, ...state.transactions],
    }));

    void dispatchSyncOrQueue(get, set, {
      id,
      action: 'add',
      payload: newTx,
      queuedAt: nowIso,
    });

    return id;
  },

  updateTransaction: (id, updatedTxData) => {
    const nowIso = new Date().toISOString();
    const normalized = normalizeTransactionAmounts(updatedTxData);
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;

    const newTx: Transaction = {
      ...existing,
      ...normalized,
      id,
      updatedAt: nowIso,
    };

    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? newTx : t)),
    }));

    void dispatchSyncOrQueue(get, set, {
      id,
      action: 'update',
      payload: newTx,
      queuedAt: nowIso,
    });
  },

  deleteTransaction: (id) => {
    const nowIso = new Date().toISOString();
    const target = get().transactions.find((t) => t.id === id);
    if (!target) return;

    const state = get();
    // Keep soft-delete tombstone if Sheets sync is enabled (for merge), else remove completely
    if (state.googleSheetsEnabled) {
      set((s) => ({
        transactions: s.transactions.map((t) =>
          t.id === id ? { ...t, deletedAt: nowIso, updatedAt: nowIso } : t
        ),
      }));
    } else {
      set((s) => ({
        transactions: s.transactions.filter((t) => t.id !== id),
      }));
    }

    if (target.hasSlipImage) {
      void deleteSlipImage(id);
    }

    void dispatchSyncOrQueue(get, set, {
      id,
      action: 'delete',
      payload: { id },
      queuedAt: nowIso,
    });
  },

  importData: (data) => {
    set((state) => ({
      settings: data.settings ? { ...state.settings, ...data.settings } : state.settings,
      transactions: data.transactions ? data.transactions : state.transactions,
      templates: data.templates ? data.templates : state.templates,
    }));
  },

  mergeTransactions: (incoming) => {
    const current = get().transactions;
    const map = new Map<string, Transaction>();
    for (const tx of current) {
      map.set(tx.id, tx);
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const tx of incoming) {
      const existing = map.get(tx.id);
      if (!existing) {
        map.set(tx.id, tx);
        added++;
      } else {
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const incomingTime = tx.updatedAt ? new Date(tx.updatedAt).getTime() : 0;
        if (incomingTime > existingTime) {
          map.set(tx.id, { ...existing, ...tx, deletedAt: undefined });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    set({ transactions: merged });
    return { added, updated, skipped };
  },

  clearData: () => {
    void clearAllSlipImages();
    set({
      settings: createDefaultSettings(),
      transactions: [],
      templates: [],
      syncQueue: [],
    });
  },
});
