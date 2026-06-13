import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncToGoogleSheets } from '../services/googleSheets';

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  type: 'expense' | 'topup';
  title: string;
  totalAmount: number;
  govAmount: number;
  userAmount: number;
  category: string;
  note: string;
  govRatio?: number;
  userRatio?: number;
}

export interface Settings {
  supportRatioGov: number;
  supportRatioUser: number;
  monthlySupportAmount: number;
  dailySupportLimit: number;
  rolloverEnabled: boolean;
  periodStart: string; // 'YYYY-MM'
  periodEnd: string; // 'YYYY-MM'
  theme: 'light' | 'dark';
  categories: string[];
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface AppState {
  walletBalance: number;
  settings: Settings;
  transactions: Transaction[];
  googleSheetUrl: string;
  googleSecretKey: string;
  googleSheetsEnabled: boolean;
  syncStatus: SyncStatus;
  syncError: string | null;
  
  setGoogleSheetsConfig: (url: string, secret: string, enabled: boolean) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  syncAllToGoogleSheets: () => Promise<void>;
  pullFromGoogleSheets: () => Promise<void>;

  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, updatedTx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  importData: (data: { walletBalance?: number; settings?: Partial<Settings>; transactions?: Transaction[] }) => void;
  clearData: () => void;
}

const defaultSettings: Settings = {
  supportRatioGov: 60,
  supportRatioUser: 40,
  monthlySupportAmount: 1000,
  dailySupportLimit: 200,
  rolloverEnabled: false,
  periodStart: '2026-06',
  periodEnd: '2026-09',
  theme: 'light',
  categories: ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป'],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      walletBalance: 0,
      settings: defaultSettings,
      transactions: [],
      googleSheetUrl: '',
      googleSecretKey: '',
      googleSheetsEnabled: false,
      syncStatus: 'idle',
      syncError: null,

      setGoogleSheetsConfig: (url, secret, enabled) => {
        set({ googleSheetUrl: url, googleSecretKey: secret, googleSheetsEnabled: enabled });
      },

      setSyncStatus: (status, error = null) => set({ syncStatus: status, syncError: error }),

      syncAllToGoogleSheets: async () => {
        const state = get();
        if (!state.googleSheetsEnabled || !state.googleSheetUrl || !state.googleSecretKey) return;
        
        set({ syncStatus: 'syncing', syncError: null });
        const result = await syncToGoogleSheets(
          state.googleSheetUrl, 
          state.googleSecretKey, 
          'sync', 
          state.transactions
        );
        set({ syncStatus: result.success ? 'success' : 'error', syncError: result.success ? null : result.message });
        
        if (result.success) {
          setTimeout(() => {
            if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
          }, 3000);
        }
      },

      pullFromGoogleSheets: async () => {
        const state = get();
        if (!state.googleSheetsEnabled || !state.googleSheetUrl || !state.googleSecretKey) return;
        
        set({ syncStatus: 'syncing', syncError: null });
        const result = await syncToGoogleSheets(
          state.googleSheetUrl, 
          state.googleSecretKey, 
          'pull', 
          null
        );
        
        if (result.success && result.data && result.data.transactions) {
          const fetchedTxs = result.data.transactions;
          
          // Recalculate wallet balance based on pulled transactions
          let newBalance = 0;
          fetchedTxs.forEach((tx: any) => {
            if (tx.type === 'topup') {
              newBalance += Number(tx.userAmount) || 0;
            } else if (tx.type === 'expense') {
              newBalance -= Number(tx.userAmount) || 0;
            }
          });
          
          set({ 
            transactions: fetchedTxs,
            walletBalance: newBalance,
            syncStatus: 'success', 
            syncError: null 
          });
        } else {
          set({ syncStatus: 'error', syncError: result.message || 'ไม่พบข้อมูลจากการดึงข้อมูล' });
        }
        
        if (result.success) {
          setTimeout(() => {
            if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
          }, 3000);
        }
      },

      addTransaction: (txData) => {
        const id = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        set((state) => {
          const newTx: Transaction = { 
            ...txData, 
            id,
            govRatio: txData.type === 'expense' ? state.settings.supportRatioGov : undefined,
            userRatio: txData.type === 'expense' ? state.settings.supportRatioUser : undefined
          };

          let newBalance = state.walletBalance;
          if (newTx.type === 'topup') {
            newBalance += newTx.userAmount;
          } else if (newTx.type === 'expense') {
            newBalance -= newTx.userAmount;
          }

          return {
            transactions: [newTx, ...state.transactions],
            walletBalance: newBalance,
          };
        });

        // Trigger Google Sheets sync
        const state = get();
        const addedTx = state.transactions.find(t => t.id === id);
        if (addedTx && state.googleSheetsEnabled) {
          set({ syncStatus: 'syncing', syncError: null });
          syncToGoogleSheets(state.googleSheetUrl, state.googleSecretKey, 'add', addedTx)
            .then(result => {
              set({ syncStatus: result.success ? 'success' : 'error', syncError: result.success ? null : result.message });
              if (result.success) {
                setTimeout(() => {
                  if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
                }, 3000);
              }
            });
        }
      },

      deleteTransaction: (id) => {
        set((state) => {
          const tx = state.transactions.find((t) => t.id === id);
          if (!tx) return state;

          let newBalance = state.walletBalance;
          if (tx.type === 'expense') {
            newBalance += tx.userAmount;
          } else if (tx.type === 'topup') {
            newBalance -= tx.userAmount;
          }

          return {
            transactions: state.transactions.filter((t) => t.id !== id),
            walletBalance: newBalance,
          };
        });

        // Trigger Google Sheets sync
        const state = get();
        if (state.googleSheetsEnabled) {
          set({ syncStatus: 'syncing', syncError: null });
          syncToGoogleSheets(state.googleSheetUrl, state.googleSecretKey, 'delete', { id })
            .then(result => {
              set({ syncStatus: result.success ? 'success' : 'error', syncError: result.success ? null : result.message });
              if (result.success) {
                setTimeout(() => {
                  if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
                }, 3000);
              }
            });
        }
      },

      updateTransaction: (id, updatedTxData) => {
        const newTx: Transaction = { ...updatedTxData, id };
        
        set((state) => {
          const oldTx = state.transactions.find((t) => t.id === id);
          if (!oldTx) return state;

          // Revert old transaction effect
          let newBalance = state.walletBalance;
          if (oldTx.type === 'expense') {
            newBalance += oldTx.userAmount;
          } else if (oldTx.type === 'topup') {
            newBalance -= oldTx.userAmount;
          }

          // Apply new transaction effect
          if (updatedTxData.type === 'expense') {
            newBalance -= updatedTxData.userAmount;
          } else if (updatedTxData.type === 'topup') {
            newBalance += updatedTxData.userAmount;
          }

          return {
            transactions: state.transactions.map((t) => t.id === id ? newTx : t),
            walletBalance: newBalance,
          };
        });

        // Trigger Google Sheets sync
        const state = get();
        if (state.googleSheetsEnabled) {
          set({ syncStatus: 'syncing', syncError: null });
          syncToGoogleSheets(state.googleSheetUrl, state.googleSecretKey, 'update', newTx)
            .then(result => {
              set({ syncStatus: result.success ? 'success' : 'error', syncError: result.success ? null : result.message });
              if (result.success) {
                setTimeout(() => {
                  if (get().syncStatus === 'success') set({ syncStatus: 'idle' });
                }, 3000);
              }
            });
        }
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setTheme: (theme) => {
        set((state) => ({
          settings: { ...state.settings, theme },
        }));
      },

      importData: (data) => {
        set((state) => ({
          walletBalance: data.walletBalance !== undefined ? data.walletBalance : state.walletBalance,
          settings: data.settings ? { ...state.settings, ...data.settings } : state.settings,
          transactions: data.transactions ? data.transactions : state.transactions,
        }));
      },

      clearData: () => {
        set({
          walletBalance: 0,
          settings: defaultSettings,
          transactions: [],
        });
      },
    }),
    {
      name: 'thai-chuay-thai-storage',
    }
  )
);
