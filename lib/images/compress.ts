// Client-side photo compression (P4-03): WebP, long edge <= 1280 px, aim for < 300 KB.
// Redrawing onto a canvas drops all metadata, so EXIF (including GPS) never leaves the phone
// (SECURITY_PRIVACY.md section 5).
import { PHOTO, fitWithin } from '@/lib/domain/review';

export type CompressedPhoto = { blob: Blob; width: number; height: number };

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  // imageOrientation applies the EXIF rotation before we throw the EXIF away.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO.maxEdge);
  try {
    // Try a few quality steps; if still too big, shrink the image and try again.
    for (let attempt = 0; attempt < 4; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no_canvas');
      ctx.drawImage(bitmap, 0, 0, width, height);
      for (const q of [0.82, 0.72, 0.62, 0.52]) {
        const blob = await toBlob(canvas, q);
        if (!blob || blob.type !== 'image/webp') throw new Error('webp_unsupported');
        if (blob.size <= PHOTO.targetBytes) return { blob, width, height };
      }
      ({ width, height } = fitWithin(width, height, Math.round(Math.max(width, height) * 0.8)));
    }
    throw new Error('too_large');
  } finally {
    bitmap.close();
  }
}
