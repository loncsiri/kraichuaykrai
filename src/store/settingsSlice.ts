import type { StateCreator } from 'zustand';
import { addMonths, format } from 'date-fns';
import type { AppState, Settings, SettingsSlice, ThemeMode, TransactionTemplate } from './types';
import { roundMoney } from '../utils/money';

export function createDefaultSettings(now: Date = new Date()): Settings {
  return {
    supportRatioGov: 60,
    supportRatioUser: 40,
    monthlySupportAmount: 1000,
    dailySupportLimit: 200,
    periodStart: format(now, 'yyyy-MM'),
    periodEnd: format(addMonths(now, 3), 'yyyy-MM'),
    theme: 'system',
    categories: ['อาหารและเครื่องดื่ม', 'เดินทาง', 'ของใช้', 'ทั่วไป'],
    openingBalance: 0,
    saveSlipLocally: false,
  };
}

export const defaultSettings: Settings = createDefaultSettings();

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  settings: defaultSettings,
  templates: [],

  updateSettings: (newSettings) => {
    set((state) => {
      const merged: Settings = {
        ...state.settings,
        ...newSettings,
      };
      if (newSettings.openingBalance !== undefined) {
        merged.openingBalance = roundMoney(newSettings.openingBalance);
      }
      if (newSettings.monthlySupportAmount !== undefined) {
        merged.monthlySupportAmount = Math.max(0, roundMoney(newSettings.monthlySupportAmount));
      }
      if (newSettings.dailySupportLimit !== undefined) {
        merged.dailySupportLimit = Math.max(0, roundMoney(newSettings.dailySupportLimit));
      }
      if (newSettings.supportRatioGov !== undefined) {
        const gov = Math.max(0, Math.min(100, Math.round(newSettings.supportRatioGov)));
        merged.supportRatioGov = gov;
        merged.supportRatioUser = 100 - gov;
      }
      return { settings: merged };
    });
  },

  setTheme: (theme: ThemeMode) => {
    set((state) => ({
      settings: { ...state.settings, theme },
    }));
  },

  addTemplate: (template: Omit<TransactionTemplate, 'id'>) => {
    const id = `tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    set((state) => ({
      templates: [
        ...state.templates,
        {
          ...template,
          id,
          amount: roundMoney(template.amount),
        },
      ],
    }));
  },

  deleteTemplate: (id: string) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }));
  },
});
