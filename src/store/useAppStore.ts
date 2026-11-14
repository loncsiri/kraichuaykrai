import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, Settings, ThemeMode, Transaction, TransactionTemplate } from './types';
import { createSettingsSlice, createDefaultSettings } from './settingsSlice';
import { createTransactionSlice } from './transactionSlice';
import { createSyncSlice } from './syncSlice';
import { calculateWalletBalance } from '../utils/calculations';
import { fromSatang, toSatang } from '../utils/money';

export type {
  AppState,
  PullMode,
  Settings,
  SyncQueueItem,
  SyncStatus,
  ThemeMode,
  Transaction,
  TransactionTemplate,
  TransactionType,
} from './types';

interface LegacyPersistedState {
  walletBalance?: number;
  settings?: Partial<Settings> & { rolloverEnabled?: boolean };
  transactions?: Transaction[];
  templates?: TransactionTemplate[];
  googleSheetUrl?: string;
  googleSecretKey?: string;
  googleSheetsEnabled?: boolean;
  lastSyncedAt?: string | null;
  syncQueue?: AppState['syncQueue'];
}

export const STORAGE_KEY = 'thai-chuay-thai-storage';
export const BACKUP_V1_KEY = 'thai-chuay-thai-storage-backup-v1';

export function migratePersistedState(persistedState: unknown, version: number): Partial<AppState> {
  if (!persistedState || typeof persistedState !== 'object') {
    return {};
  }

  const old = persistedState as LegacyPersistedState;

  if (version < 2) {
    // Save one-time raw backup of v1 data before migrating
    try {
      if (typeof localStorage !== 'undefined' && !localStorage.getItem(BACKUP_V1_KEY)) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) localStorage.setItem(BACKUP_V1_KEY, raw);
      }
    } catch {
      // Ignore storage quota errors during backup
    }

    const oldTransactions = Array.isArray(old.transactions) ? old.transactions : [];
    const oldSettings = old.settings || {};
    const defaults = createDefaultSettings();

    // Preserve exact prior wallet balance as openingBalance if it differed from tx sum
    let openingBalance =
      typeof oldSettings.openingBalance === 'number' ? oldSettings.openingBalance : 0;

    if (typeof old.walletBalance === 'number' && oldSettings.openingBalance === undefined) {
      const txDerived = calculateWalletBalance(oldTransactions, 0);
      const diffSatang = toSatang(old.walletBalance) - toSatang(txDerived);
      if (diffSatang !== 0) {
        openingBalance = fromSatang(diffSatang);
      }
    }

    const theme: ThemeMode =
      oldSettings.theme === 'dark' || oldSettings.theme === 'light' || oldSettings.theme === 'system'
        ? oldSettings.theme
        : 'system';

    const { rolloverEnabled: _removed, ...cleanOldSettings } = oldSettings;
    void _removed;

    return {
      settings: {
        ...defaults,
        ...cleanOldSettings,
        theme,
        openingBalance,
        saveSlipLocally: oldSettings.saveSlipLocally ?? false,
      },
      transactions: oldTransactions,
      templates: Array.isArray(old.templates) ? old.templates : [],
      googleSheetUrl: old.googleSheetUrl || '',
      googleSecretKey: old.googleSecretKey || '',
      googleSheetsEnabled: Boolean(old.googleSheetsEnabled),
      lastSyncedAt: old.lastSyncedAt || null,
      syncQueue: Array.isArray(old.syncQueue) ? old.syncQueue : [],
    };
  }

  return old as Partial<AppState>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createSettingsSlice(set, get, api),
      ...createTransactionSlice(set, get, api),
      ...createSyncSlice(set, get, api),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: migratePersistedState,
      partialize: (state) => ({
        settings: state.settings,
        transactions: state.transactions,
        templates: state.templates,
        googleSheetUrl: state.googleSheetUrl,
        googleSecretKey: state.googleSecretKey,
        googleSheetsEnabled: state.googleSheetsEnabled,
        lastSyncedAt: state.lastSyncedAt,
        syncQueue: state.syncQueue,
      }),
    }
  )
);

export function useActiveTransactions(): Transaction[] {
  const transactions = useAppStore((s) => s.transactions);
  return useMemo(() => transactions.filter((t) => !t.deletedAt), [transactions]);
}

export function useWalletBalance(): number {
  const transactions = useAppStore((s) => s.transactions);
  const openingBalance = useAppStore((s) => s.settings.openingBalance);
  return useMemo(
    () => calculateWalletBalance(transactions, openingBalance),
    [transactions, openingBalance]
  );
}
