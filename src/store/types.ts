export type TransactionType = 'expense' | 'topup';
export type ThemeMode = 'system' | 'light' | 'dark';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
export type PullMode = 'merge' | 'replace';

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  type: TransactionType;
  title: string;
  totalAmount: number;
  govAmount: number;
  userAmount: number;
  category: string;
  note: string;
  govRatio?: number;
  userRatio?: number;
  hasSlipImage?: boolean;
  updatedAt?: string;
  deletedAt?: string;
}

export interface TransactionTemplate {
  id: string;
  title: string;
  amount: number;
  category: string;
  note?: string;
}

export interface Settings {
  supportRatioGov: number;
  supportRatioUser: number;
  monthlySupportAmount: number;
  dailySupportLimit: number;
  periodStart: string; // 'YYYY-MM'
  periodEnd: string;   // 'YYYY-MM'
  theme: ThemeMode;
  categories: string[];
  openingBalance: number;
  saveSlipLocally: boolean;
}

export interface SyncQueueItem {
  id: string; // transaction id or 'sync-all'
  action: 'add' | 'update' | 'delete' | 'sync';
  payload: unknown;
  queuedAt: string;
}

export interface SettingsSlice {
  settings: Settings;
  templates: TransactionTemplate[];
  updateSettings: (settings: Partial<Settings>) => void;
  setTheme: (theme: ThemeMode) => void;
  addTemplate: (template: Omit<TransactionTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;
}

export interface TransactionSlice {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => string;
  updateTransaction: (id: string, updatedTx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  importData: (data: {
    settings?: Partial<Settings>;
    transactions?: Transaction[];
    templates?: TransactionTemplate[];
  }) => void;
  mergeTransactions: (incoming: Transaction[]) => { added: number; updated: number; skipped: number };
  clearData: () => void;
}

export interface SyncSlice {
  googleSheetUrl: string;
  googleSecretKey: string;
  googleSheetsEnabled: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  syncQueue: SyncQueueItem[];

  setGoogleSheetsConfig: (url: string, secret: string, enabled: boolean) => void;
  clearGoogleSheetsConfig: () => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  syncAllToGoogleSheets: () => Promise<void>;
  pullFromGoogleSheets: (mode?: PullMode) => Promise<{ added: number; updated: number; total: number } | null>;
  flushSyncQueue: () => Promise<void>;
}

export type AppState = SettingsSlice & TransactionSlice & SyncSlice;
