import Tesseract from 'tesseract.js';
import { format } from 'date-fns';

export interface ParsedSlipData {
  title: string;
  totalAmount: number;
  govAmount: number;
  userAmount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

const MONTH_MAP: Record<string, string> = {
  'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04',
  'พ.ค.': '05', 'มิ.ย.': '06', 'ก.ค.': '07', 'ส.ค.': '08',
  'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
};

const cleanNumber = (str: string): number => {
  // Remove anything that is not a digit, dot, or minus sign
  const cleaned = str.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const scanSlip = async (
  imageFile: File, 
  onProgress: (progress: number) => void
): Promise<ParsedSlipData> => {
  
  const worker = await Tesseract.createWorker('tha+eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress(m.progress);
      }
    }
  });

  const { data: { text } } = await worker.recognize(imageFile);
  await worker.terminate();

  console.log('OCR Result:', text);

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let title = '';
  let totalAmount = 0;
  let govAmount = 0;
  let userAmount = 0;
  let date = format(new Date(), 'yyyy-MM-dd');
  let time = format(new Date(), 'HH:mm');

  // Regex patterns
  // Example: 12 มิ.ย. 2569 12:28 น.
  const dateRegex = /(\d{1,2})\s+(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s+(\d{4})\s+(\d{1,2}:\d{2})/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match Date
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const monthStr = dateMatch[2];
      let year = parseInt(dateMatch[3]);
      // Convert Buddhist era to Gregorian if year > 2500
      if (year > 2500) year -= 543;
      
      date = `${year}-${MONTH_MAP[monthStr]}-${day}`;
      time = dateMatch[4];
    }

    // Amount matchers
    if (line.includes('ค่าสินค้า') || line.includes('บริการ')) {
      const match = line.match(/[\d,.]+(?=\s*บาท)/) || line.match(/[\d,.]+/g);
      if (match) {
        totalAmount = cleanNumber(match[match.length - 1]);
      }
    }

    if (line.includes('สิทธิ') || line.includes('ช่วย')) {
      const match = line.match(/[-]?[\d,.]+(?=\s*บาท)/) || line.match(/[-]?[\d,.]+/g);
      if (match) {
        govAmount = Math.abs(cleanNumber(match[match.length - 1]));
      }
    }

    if (line.includes('จํานวนเงิน') || line.includes('จำนวนเงิน') || line.includes('ชําระ') || line.includes('ชำระ')) {
      const match = line.match(/[\d,.]+(?=\s*บาท)/) || line.match(/[\d,.]+/g);
      if (match) {
        userAmount = cleanNumber(match[match.length - 1]);
      }
    }
  }

  let gWalletIndex = lines.findIndex(l => l.toLowerCase().includes('g-wallet'));
  if (gWalletIndex !== -1) {
    for(let j = gWalletIndex + 1; j < Math.min(gWalletIndex + 5, lines.length); j++) {
      let l = lines[j].trim();
      
      // Remove standalone non-alphanumeric junk often read from logos/arrows
      let cleanLine = l.replace(/^[\|↓_!\-\s]+/, '');
      
      // Remove 'w', 'W', 'v', 'V' if they are standalone before a space OR followed by a Thai character
      cleanLine = cleanLine.replace(/^[wWvV]\s+/, '');
      cleanLine = cleanLine.replace(/^[wWvV](?=[\u0E00-\u0E7F])/, '');
      cleanLine = cleanLine.trim();

      if (cleanLine.length > 3) {
        title = cleanLine;
        break;
      }
    }
  }

  // Validation and Auto-correction for OCR errors (like 0 read as 6)
  if (totalAmount > 0 && govAmount > 0 && userAmount > 0) {
    // If the sum of gov and user amount doesn't match total, trust the sum 
    // because individual smaller numbers are less prone to single-character errors (e.g. 60 -> 66)
    const expectedTotal = govAmount + userAmount;
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      console.log(`OCR Correction: totalAmount changed from ${totalAmount} to ${expectedTotal}`);
      totalAmount = expectedTotal;
    }
  }

  return {
    title,
    totalAmount,
    govAmount,
    userAmount,
    date,
    time
  };
};
