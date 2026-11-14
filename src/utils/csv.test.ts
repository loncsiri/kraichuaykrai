import { describe, it, expect } from 'vitest';
import {
  createJsonBackup,
  exportTransactionsToCSV,
  parseCSVTransactions,
  parseJsonBackup,
} from './csv';
import { createDefaultSettings } from '../store/settingsSlice';
import type { Transaction } from '../store/types';

describe('CSV export/import', () => {
  it('roundtrips transactions with quotes, commas, newlines, and ratios', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-1',
        timestamp: '2026-11-14T08:30:00.000Z',
        type: 'expense',
        title: 'ร้าน "ก๋วยเตี๋ยว", ซอย 5',
        totalAmount: 100,
        govAmount: 60,
        userAmount: 40,
        govRatio: 60,
        userRatio: 40,
        category: 'อาหารและเครื่องดื่ม',
        note: 'บรรทัดที่ 1\nบรรทัดที่ 2',
      },
      {
        id: 'tx-2',
        timestamp: '2026-11-14T09:00:00.000Z',
        type: 'topup',
        title: 'เติมเงิน',
        totalAmount: 0,
        govAmount: 0,
        userAmount: 500,
        category: '',
        note: '',
      },
    ];

    const csv = exportTransactionsToCSV(txs);
    const parsed = parseCSVTransactions(csv);

    expect(parsed.errors).toHaveLength(0);
    expect(parsed.valid).toHaveLength(2);
    expect(parsed.valid[0].title).toBe('ร้าน "ก๋วยเตี๋ยว", ซอย 5');
    expect(parsed.valid[0].note).toBe('บรรทัดที่ 1\nบรรทัดที่ 2');
    expect(parsed.valid[0].govRatio).toBe(60);
    expect(parsed.valid[0].userRatio).toBe(40);
    expect(parsed.valid[1].type).toBe('topup');
    expect(parsed.valid[1].userAmount).toBe(500);
  });

  it('imports legacy 9-column CSV without ratio columns', () => {
    const legacyCsv = [
      'id,timestamp,type,title,totalAmount,govAmount,userAmount,category,note',
      'tx-123,2026-06-13T12:30:00.000Z,expense,"ข้าวมันไก่",50,30,20,"อาหารและเครื่องดื่ม","อร่อย"',
    ].join('\n');

    const parsed = parseCSVTransactions(legacyCsv);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.valid).toHaveLength(1);
    expect(parsed.valid[0].govRatio).toBeUndefined();
    expect(parsed.valid[0].totalAmount).toBe(50);
  });

  it('reports invalid rows clearly without dropping valid rows', () => {
    const badCsv = [
      'id,timestamp,type,title,totalAmount,govAmount,userAmount,category,note',
      'tx-ok,2026-11-14T10:00:00Z,expense,กาแฟ,60,36,24,อาหาร,',
      'tx-bad-date,not-a-date,expense,ขนม,20,12,8,อาหาร,',
      'tx-bad-type,2026-11-14T10:00:00Z,refund,คืนเงิน,20,0,20,อาหาร,',
    ].join('\n');

    const parsed = parseCSVTransactions(badCsv);
    expect(parsed.valid).toHaveLength(1);
    expect(parsed.errors).toHaveLength(2);
  });
});

describe('JSON backup', () => {
  it('creates and restores full JSON backup', () => {
    const settings = createDefaultSettings(new Date('2026-11-14T00:00:00Z'));
    const json = createJsonBackup({
      settings,
      transactions: [],
      templates: [{ id: 'tpl-1', title: 'กาแฟเช้า', amount: 60, category: 'อาหารและเครื่องดื่ม' }],
    });
    const restored = parseJsonBackup(json);
    expect(restored.app).toBe('kraichuaykrai');
    expect(restored.templates).toHaveLength(1);
    expect(restored.settings.supportRatioGov).toBe(60);
  });
});
