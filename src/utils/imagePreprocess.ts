export interface PreprocessedImage {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

/**
 * Normalizes EXIF orientation (crucial for iPhone photos), scales image to
 * optimal OCR resolution (~1200px wide), and applies grayscale + contrast stretch
 * to reduce JPEG compression artifacts that cause digit misreads (e.g. 60 -> 66).
 */
export async function preprocessSlipImage(file: File): Promise<PreprocessedImage> {
  const fallbackUrl = URL.createObjectURL(file);

  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    return { blob: file, previewUrl: fallbackUrl, width: 0, height: 0 };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const targetWidth = Math.min(1400, Math.max(900, bitmap.width));
    const scale = targetWidth / bitmap.width;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { blob: file, previewUrl: fallbackUrl, width: bitmap.width, height: bitmap.height };
    }

    // White background in case of transparent PNG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Grayscale + gentle contrast boost
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const contrast = 1.28;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const adjusted = Math.min(255, Math.max(0, (lum - 128) * contrast + 128));
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    }
    ctx.putImageData(imgData, 0, 0);

    const processedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || file), 'image/png');
    });

    URL.revokeObjectURL(fallbackUrl);
    const previewUrl = URL.createObjectURL(processedBlob);
    return { blob: processedBlob, previewUrl, width, height };
  } catch {
    return { blob: file, previewUrl: fallbackUrl, width: 0, height: 0 };
  } finally {
    bitmap?.close();
  }
}
