import Tesseract from 'tesseract.js';
import { preprocessSlipImage } from './imagePreprocess';
import { parseSlipText } from './slipParser';
import type { ParsedSlipData } from './slipParser';

export type { ParsedSlipData } from './slipParser';

export interface ScanSlipResult extends ParsedSlipData {
  previewUrl: string;
}

export const scanSlip = async (
  imageFile: File,
  onProgress: (progress: number) => void
): Promise<ScanSlipResult> => {
  const processed = await preprocessSlipImage(imageFile);

  const worker = await Tesseract.createWorker('tha+eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core',
    langPath: '/tesseract/lang',
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress(m.progress);
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(processed.blob);

    const parsed = parseSlipText(text);
    return {
      ...parsed,
      previewUrl: processed.previewUrl,
    };
  } finally {
    await worker.terminate();
  }
};
