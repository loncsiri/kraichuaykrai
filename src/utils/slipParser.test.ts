import { describe, it, expect } from 'vitest';
import { cleanTitlePrefix, parseSlipText } from './slipParser';

describe('cleanTitlePrefix', () => {
  it('strips Ww and arrow OCR artifacts cleanly', () => {
    expect(cleanTitlePrefix('Ww XTENCAFE')).toBe('XTENCAFE');
    expect(cleanTitlePrefix('wร้านข้าวมันไก่')).toBe('ร้านข้าวมันไก่');
    expect(cleanTitlePrefix('w| ↓ ร้านกาแฟ')).toBe('ร้านกาแฟ');
    expect(cleanTitlePrefix('Waterfront Cafe')).toBe('Waterfront Cafe');
  });
});

describe('parseSlipText', () => {
  it('parses G-Wallet slip and fixes iPhone 60 -> 66 misread', () => {
    const ocrText = `
      ชำระเงินสำเร็จ
      14 พ.ย. 2569 10:15 น.
      G-Wallet
      Ww XTENCAFE
      ค่าสินค้า/บริการ 66.00 บาท
      สิทธิคนละครึ่งช่วยจ่าย 36.00 บาท
      จำนวนเงิน 24.00 บาท
    `;

    const res = parseSlipText(ocrText);
    expect(res.parserName).toBe('g-wallet');
    expect(res.title).toBe('XTENCAFE');
    expect(res.govAmount).toBe(36);
    expect(res.userAmount).toBe(24);
    expect(res.totalAmount).toBe(60);
    expect(res.mathCorrected).toBe(true);
    expect(res.date).toBe('2026-11-14');
    expect(res.time).toBe('10:15');
  });

  it('parses standard Thai bank transfer slip', () => {
    const ocrText = `
      โอนเงินสำเร็จ
      12 มิ.ย. 2569 12:28 น.
      จาก นาย ก
      ไปยัง ร้านก๋วยเตี๋ยวเรือ
      จำนวนเงิน 85.50 บาท
    `;

    const res = parseSlipText(ocrText);
    expect(res.parserName).toBe('bank-transfer');
    expect(res.title).toBe('ร้านก๋วยเตี๋ยวเรือ');
    expect(res.totalAmount).toBe(85.5);
    expect(res.date).toBe('2026-06-12');
    expect(res.time).toBe('12:28');
  });
});
