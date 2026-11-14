import { format } from 'date-fns';
import { roundMoney } from './money';

export interface ParsedSlipData {
  title: string;
  totalAmount: number;
  govAmount: number;
  userAmount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  parserName: 'g-wallet' | 'bank-transfer' | 'generic';
  mathCorrected: boolean;
  warnings: string[];
  rawText: string;
}

const MONTH_MAP: Record<string, string> = {
  'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
  'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
  'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12',
};

export function cleanNumber(str: string): number {
  const cleaned = str.replace(/[^\d.-]/g, '');
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? roundMoney(val) : 0;
}

export function cleanTitlePrefix(raw: string): string {
  let cleanLine = raw.trim();
  let lastLength = 0;

  while (cleanLine.length !== lastLength) {
    lastLength = cleanLine.length;
    // Remove standalone non-alphanumeric junk from arrows/icons
    cleanLine = cleanLine.replace(/^[|↓_!•·*►▶▸➤\s-]+/, '');
    // Remove w/W/v/V artifacts before whitespace (e.g. "Ww XTENCAFE")
    cleanLine = cleanLine.replace(/^[wWvV]+\s+/, '');
    // Remove w/W/v/V artifacts directly attached to Thai characters (e.g. "wร้าน")
    cleanLine = cleanLine.replace(/^[wWvV]+(?=[\u0E00-\u0E7F])/, '');
    // Remove w/W/v/V followed by junk symbol (e.g. "w|")
    cleanLine = cleanLine.replace(/^[wWvV]+(?=[|↓_!-])/, '');
  }

  return cleanLine.trim();
}

function extractThaiDateAndTime(lines: string[]): { date: string; time: string; foundDate: boolean } {
  const now = new Date();
  let date = format(now, 'yyyy-MM-dd');
  let time = format(now, 'HH:mm');
  let foundDate = false;

  const thaiDateRegex =
    /(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{2,4})(?:\s+(\d{1,2}:\d{2}))?/;
  const numericDateRegex = /(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}:\d{2}))?/;
  const standaloneTimeRegex = /(\d{1,2}:\d{2})\s*(?:น\.|น)?/;

  for (const line of lines) {
    const thaiMatch = line.match(thaiDateRegex);
    if (thaiMatch) {
      const day = thaiMatch[1].padStart(2, '0');
      const month = MONTH_MAP[thaiMatch[2]];
      let year = parseInt(thaiMatch[3], 10);
      if (year < 100) year += 2500; // e.g. 69 -> 2569
      if (year > 2400) year -= 543;
      date = `${year}-${month}-${day}`;
      if (thaiMatch[4]) time = thaiMatch[4].padStart(5, '0');
      foundDate = true;
      break;
    }

    const numMatch = line.match(numericDateRegex);
    if (numMatch) {
      const day = numMatch[1].padStart(2, '0');
      const month = numMatch[2].padStart(2, '0');
      let year = parseInt(numMatch[3], 10);
      if (year < 100) year += 2500;
      if (year > 2400) year -= 543;
      if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
        date = `${year}-${month}-${day}`;
        if (numMatch[4]) time = numMatch[4].padStart(5, '0');
        foundDate = true;
        break;
      }
    }
  }

  // Fallback time search if date line didn't include time
  if (foundDate) {
    for (const line of lines) {
      const tm = line.match(standaloneTimeRegex);
      if (tm && (line.includes('น.') || line.match(/\d{1,2}:\d{2}/))) {
        const [h, m] = tm[1].split(':').map(Number);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          break;
        }
      }
    }
  }

  return { date, time, foundDate };
}

function parseAmountFromLine(line: string): number {
  const bahtMatch = line.match(/[-]?[\d,]+\.\d{2}(?=\s*(?:บาท|THB|฿))|[-]?[\d,]+(?=\s*(?:บาท|THB|฿))/);
  if (bahtMatch) return Math.abs(cleanNumber(bahtMatch[0]));
  const numMatches = line.match(/[-]?[\d,]+\.\d{2}|[-]?[\d,]+/g);
  if (numMatches && numMatches.length > 0) {
    return Math.abs(cleanNumber(numMatches[numMatches.length - 1]));
  }
  return 0;
}

function parseGWallet(lines: string[], rawText: string): ParsedSlipData | null {
  const lowerText = rawText.toLowerCase();
  const isGWallet =
    lowerText.includes('g-wallet') ||
    rawText.includes('เป๋าตัง') ||
    (rawText.includes('ค่าสินค้า') && (rawText.includes('สิทธิ') || rawText.includes('ช่วย')));

  if (!isGWallet) return null;

  let title = '';
  let totalAmount = 0;
  let govAmount = 0;
  let userAmount = 0;
  const warnings: string[] = [];
  let mathCorrected = false;

  const { date, time, foundDate } = extractThaiDateAndTime(lines);
  if (!foundDate) warnings.push('ไม่พบวันที่ในสลิป (ใช้วันที่ปัจจุบันแทน)');

  for (const line of lines) {
    if (line.includes('ค่าสินค้า') || line.includes('บริการ')) {
      const amt = parseAmountFromLine(line);
      if (amt > 0) totalAmount = amt;
    }
    if (line.includes('สิทธิ') || line.includes('ช่วย')) {
      const amt = parseAmountFromLine(line);
      if (amt > 0) govAmount = amt;
    }
    if (
      line.includes('จํานวนเงิน') ||
      line.includes('จำนวนเงิน') ||
      line.includes('ชําระ') ||
      line.includes('ชำระ')
    ) {
      const amt = parseAmountFromLine(line);
      if (amt > 0) userAmount = amt;
    }
  }

  const gWalletIndex = lines.findIndex((l) => l.toLowerCase().includes('g-wallet'));
  if (gWalletIndex !== -1) {
    for (let j = gWalletIndex + 1; j < Math.min(gWalletIndex + 5, lines.length); j++) {
      const cleaned = cleanTitlePrefix(lines[j]);
      if (
        cleaned.length > 2 &&
        !cleaned.includes('ค่าสินค้า') &&
        !cleaned.includes('รหัสอ้างอิง') &&
        !cleaned.match(/^\d+$/)
      ) {
        title = cleaned;
        break;
      }
    }
  }

  if (totalAmount > 0 && govAmount > 0 && userAmount > 0) {
    const expectedTotal = roundMoney(govAmount + userAmount);
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      warnings.push(
        `ตรวจพบตัวเลขยอดรวมเพี้ยน (${totalAmount} → ${expectedTotal} บาท) และปรับแก้อัตโนมัติแล้ว`
      );
      totalAmount = expectedTotal;
      mathCorrected = true;
    }
  } else if (totalAmount === 0 && govAmount + userAmount > 0) {
    totalAmount = roundMoney(govAmount + userAmount);
  }

  if (totalAmount === 0) warnings.push('อ่านยอดเงินรวมไม่สำเร็จ กรุณาตรวจสอบก่อนบันทึก');

  return {
    title,
    totalAmount,
    govAmount,
    userAmount,
    date,
    time,
    parserName: 'g-wallet',
    mathCorrected,
    warnings,
    rawText,
  };
}

function parseBankTransfer(lines: string[], rawText: string): ParsedSlipData {
  let title = '';
  let totalAmount = 0;
  const warnings: string[] = [];

  const { date, time, foundDate } = extractThaiDateAndTime(lines);
  if (!foundDate) warnings.push('ไม่พบวันที่ในสลิป (ใช้วันที่ปัจจุบันแทน)');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      totalAmount === 0 &&
      (line.includes('จํานวนเงิน') ||
        line.includes('จำนวนเงิน') ||
        line.includes('จำนวน:') ||
        line.includes('Amount') ||
        line.match(/[\d,]+\.\d{2}\s*(?:บาท|THB)/))
    ) {
      const amt = parseAmountFromLine(line);
      if (amt > 0) totalAmount = amt;
    }

    if (!title && (line.includes('ไปยัง') || line.includes('ผู้รับ') || /^To\b/i.test(line))) {
      const sameLineRest = cleanTitlePrefix(
        line.replace(/^.*?(?:ไปยัง|ผู้รับเงิน|ผู้รับ|To)\s*[:：]?\s*/i, '')
      );
      if (sameLineRest.length > 2 && !sameLineRest.match(/^x+\d+/i)) {
        title = sameLineRest;
      } else if (i + 1 < lines.length) {
        const nextClean = cleanTitlePrefix(lines[i + 1]);
        if (nextClean.length > 2) title = nextClean;
      }
    }
  }

  if (totalAmount === 0) {
    // Fallback: pick largest decimal number followed by บาท/THB or on its own
    for (const line of lines) {
      if (line.includes('ค่าธรรมเนียม') || line.includes('Fee')) continue;
      const m = line.match(/([\d,]+\.\d{2})\s*(?:บาท|THB)?/);
      if (m) {
        const val = cleanNumber(m[1]);
        if (val > totalAmount) totalAmount = val;
      }
    }
  }

  if (totalAmount === 0) warnings.push('อ่านยอดเงินไม่สำเร็จ กรุณากรอกหรือตรวจสอบยอดเงิน');

  return {
    title,
    totalAmount,
    govAmount: 0,
    userAmount: totalAmount,
    date,
    time,
    parserName: lines.some((l) => l.includes('บาท') || l.includes('THB')) ? 'bank-transfer' : 'generic',
    mathCorrected: false,
    warnings,
    rawText,
  };
}

export function parseSlipText(text: string): ParsedSlipData {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return parseGWallet(lines, text) ?? parseBankTransfer(lines, text);
}
