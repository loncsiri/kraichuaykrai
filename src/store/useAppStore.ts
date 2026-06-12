import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface AppState {
  walletBalance: number;
  settings: Settings;
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
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
    (set) => ({
      walletBalance: 0,
      settings: defaultSettings,
      transactions: [],

      addTransaction: (txData) => {
        const id = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newTx: Transaction = { ...txData, id };

        set((state) => {
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
