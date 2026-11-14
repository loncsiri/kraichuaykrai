import Papa from 'papaparse';
import { isValid, parseISO } from 'date-fns';
import type { Settings, Transaction, TransactionTemplate, TransactionType } from '../store/types';
import { roundMoney } from './money';

export interface CsvRowError {
  row: number;
  reason: string;
}

export interface CsvParseResult {
  valid: Transaction[];
  errors: CsvRowError[];
}

export const CSV_COLUMNS = [
  'id',
  'timestamp',
  'type',
  'title',
  'totalAmount',
  'govAmount',
  'userAmount',
  'govRatio',
  'userRatio',
  'category',
  'note',
] as const;

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const active = transactions.filter((t) => !t.deletedAt);
  const rows = active.map((tx) => ({
    id: tx.id,
    timestamp: tx.timestamp,
    type: tx.type,
    title: tx.title,
    totalAmount: roundMoney(tx.totalAmount),
    govAmount: roundMoney(tx.govAmount),
    userAmount: roundMoney(tx.userAmount),
    govRatio: tx.govRatio !== undefined ? tx.govRatio : '',
    userRatio: tx.userRatio !== undefined ? tx.userRatio : '',
    category: tx.category || '',
    note: tx.note || '',
  }));

  const csv = Papa.unparse(rows, {
    columns: [...CSV_COLUMNS],
    quotes: true,
  });

  return '\uFEFF' + csv;
}

function parseOptionalNumber(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const trimmed = String(val).trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

export function parseCSVTransactions(csvText: string): CsvParseResult {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { valid: [], errors: [{ row: 0, reason: 'ไฟล์ว่างเปล่า' }] };
  }

  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const valid: Transaction[] = [];
  const errors: CsvRowError[] = [];

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push({
        row: (err.row ?? 0) + 2,
        reason: err.message || 'รูปแบบ CSV ไม่ถูกต้อง',
      });
    }
  }

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2; // 1-indexed + header row
    const id = (row.id || '').trim();
    const timestampRaw = (row.timestamp || '').trim();
    const typeRaw = (row.type || '').trim().toLowerCase();
    const title = (row.title || '').trim();

    if (!id) {
      errors.push({ row: rowNumber, reason: 'ไม่มีค่า id' });
      return;
    }

    if (!timestampRaw) {
      errors.push({ row: rowNumber, reason: `รายการ ${id}: ไม่มี timestamp` });
      return;
    }

    const parsedDate = parseISO(timestampRaw);
    const fallbackDate = isValid(parsedDate) ? parsedDate : new Date(timestampRaw);
    if (!isValid(fallbackDate)) {
      errors.push({ row: rowNumber, reason: `รายการ ${id}: รูปแบบวันที่ไม่ถูกต้อง (${timestampRaw})` });
      return;
    }

    if (typeRaw !== 'expense' && typeRaw !== 'topup') {
      errors.push({ row: rowNumber, reason: `รายการ ${id}: type ต้องเป็น expense หรือ topup` });
      return;
    }

    if (!title) {
      errors.push({ row: rowNumber, reason: `รายการ ${id}: ไม่มีชื่อรายการ (title)` });
      return;
    }

    const totalAmount = roundMoney(parseFloat(row.totalAmount || '0') || 0);
    const govAmount = roundMoney(parseFloat(row.govAmount || '0') || 0);
    const userAmount = roundMoney(parseFloat(row.userAmount || '0') || 0);
    const govRatio = parseOptionalNumber(row.govRatio);
    const userRatio = parseOptionalNumber(row.userRatio);

    valid.push({
      id,
      timestamp: fallbackDate.toISOString(),
      type: typeRaw as TransactionType,
      title,
      totalAmount,
      govAmount,
      userAmount,
      govRatio,
      userRatio,
      category: (row.category || '').trim(),
      note: (row.note || '').trim(),
      updatedAt: new Date().toISOString(),
    });
  });

  return { valid, errors };
}

export interface FullBackupData {
  app: 'kraichuaykrai';
  version: number;
  exportedAt: string;
  settings: Partial<Settings>;
  transactions: Transaction[];
  templates: TransactionTemplate[];
}

export function createJsonBackup(data: {
  settings: Settings;
  transactions: Transaction[];
  templates: TransactionTemplate[];
}): string {
  const payload: FullBackupData = {
    app: 'kraichuaykrai',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: data.settings,
    transactions: data.transactions,
    templates: data.templates,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseJsonBackup(jsonText: string): FullBackupData {
  const raw = JSON.parse(jsonText) as Partial<FullBackupData>;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.transactions)) {
    throw new Error('ไฟล์สำรองข้อมูลไม่ถูกต้อง');
  }
  return {
    app: 'kraichuaykrai',
    version: raw.version || 1,
    exportedAt: raw.exportedAt || new Date().toISOString(),
    settings: raw.settings || {},
    transactions: raw.transactions,
    templates: Array.isArray(raw.templates) ? raw.templates : [],
  };
}
